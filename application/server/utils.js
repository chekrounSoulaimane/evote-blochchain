/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
'use strict';

// Bring key classes into scope, most importantly Fabric SDK network class
const fs = require('fs');
const path = require('path');
const { FileSystemWallet, Wallets, Gateway, User, X509WalletMixin } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

//  global variables for HLFabric
var gateway;
var network;
var contract = null;
var configdata;
var wallet;
var bLocalHost;
var ccp;
var orgMSPID;
const EVENT_TYPE = "bcpocevent";  //  HLFabric EVENT

const SUCCESS = 0;
const utils = {};

// Main program function

utils.prepareErrorResponse = (error, code, message) => {

    let errorMsg;
    try {
        // Pull specific fabric transaction error message out of error stack
        let entries = Object.entries(error);
        errorMsg = entries[0][1][0]["message"];
    } catch (exception) {
        // Error wasn't sent from fabric, so can't pull error out.
        errorMsg = null;
    }

    let result = { "code": code, "message": errorMsg?errorMsg:message, "error": error };
    console.log("utils.js:prepareErrorResponse(): " + message);
    console.log(result);
    return result;
}


utils.connectGatewayFromConfig = async () => {
    console.log(">>>connectGatewayFromConfig:  ");

    // A gateway defines the peers used to access Fabric networks
    gateway = new Gateway();

    try {

        // Read configuration file which gives
        //  1.  connection profile - that defines the blockchain network and the endpoints for its CA, Peers
        //  2.  network name
        //  3.  channel name
        //  4.  wallet - collection of certificates
        //  5.  username - identity to be used for performing transactions

        const platform = process.env.PLATFORM || 'LOCAL';
        if (platform == 'IBP') {
            configdata = JSON.parse(fs.readFileSync('../gateway/ibp/config.json', 'utf8'));
            console.log("Platform = " + platform);
            bLocalHost = false;
        } else { // PLATFORM = LOCAL
            configdata = JSON.parse(fs.readFileSync('../gateway/local/config.json', 'utf8'));
            console.log("Platform = " + platform);
            bLocalHost = true;
        }

        let walletpath = configdata["wallet"];
        console.log("walletpath = " + walletpath);

        // Parse the connection profile. This would be the path to the file downloaded
        // from the IBM Blockchain Platform operational console.
        const ccpPath = path.resolve(__dirname, configdata["connection_profile_filename"]);
        var userid = process.env.FABRIC_USER_ID || "admin";
        var pwd = process.env.FABRIC_USER_SECRET || "adminpw";
        var usertype = process.env.FABRIC_USER_TYPE || "admin";
        console.log('user: ' + userid + ", pwd: ", pwd + ", usertype: ", usertype);

        // Load connection profile; will be used to locate a gateway
        ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Set up the MSP Id
        orgMSPID = ccp.client.organization;
        console.log('MSP ID: ' + orgMSPID);

        // Open path to the identity wallet
        wallet = new FileSystemWallet(walletpath)
        //wallet = await Wallets.newFileSystemWallet(walletpath);

        const idExists = await wallet.exists(userid);
        if (!idExists) {
            // Enroll identity in the wallet
            console.log(`Enrolling and importing ${userid} into wallet`);
            await utils.enrollUser(userid, pwd, usertype);
        }

        // Connect to gateway using application specified parameters
        console.log('Connect to Fabric gateway.');
        await gateway.connect(ccp, {
            identity: userid, wallet: wallet, discovery: { enabled: true, asLocalhost: bLocalHost }
        });

        // Access channel: channel_name
        console.log('Use network channel: ' + configdata["channel_name"]);

        // Get addressability to the smart contract as specified in config
        network = await gateway.getNetwork(configdata["channel_name"]);
        console.log('Use ' + configdata["smart_contract_name"] + ' smart contract.');

        //  this variable, contract will be used in subsequent calls to submit transactions to Fabric
        contract = await network.getContract(configdata["smart_contract_name"]);

    } catch (error) {
        console.log('Error connecting to Fabric network. ' + error.toString());
    } finally {
    }
    return contract;
}


utils.submitTx = async(contract, txName, ...args) => {
    console.log(">>>utils.submitTx..."+txName+" ("+args+")");
    let result = contract.submitTransaction(txName, ...args);
    return result.then (response => {
        // console.log ('Transaction submitted successfully;  Response: ', response.toString());
        console.log ('utils.js: Transaction submitted successfully');
        return Promise.resolve(response.toString());
    },(error) =>
        {
          console.log ('utils.js: Error:' + error.toString());
          return Promise.reject(error);
        });
}

//  function registerUser
//  Purpose: Utility function for registering users with HL Fabric CA.
utils.registerUser = async (userid, userpwd, usertype, adminIdentity) => {
    console.log("\n------------  utils.registerUser ---------------");
    console.log("\n userid: " + userid + ", pwd: " + userpwd + ", usertype: " + usertype)

    const gateway = new Gateway();

    // Connect to gateway as admin
    await gateway.connect(ccp, { wallet, identity: adminIdentity, discovery: { enabled: false, asLocalhost: bLocalHost } });

    const orgs = ccp.organizations;
    const CAs = ccp.certificateAuthorities;
    const fabricCAKey = orgs[orgMSPID].certificateAuthorities[0];
    const caURL = CAs[fabricCAKey].url;
    const ca = new FabricCAServices(caURL, { trustedRoots: [], verify: false });

    var newUserDetails = {
        enrollmentID: userid,
        enrollmentSecret: userpwd,
        role: "client",
        //affiliation: orgMSPID,
        //profile: 'tls',
        attrs: [
            {
                "name": "usertype",
                "value": usertype,
                "ecert": true
            }],
        maxEnrollments: 5
    };

    //  Register is done using admin signing authority
    return ca.register(newUserDetails, gateway.getCurrentIdentity())
        .then(newPwd => {
            //  if a password was set in 'enrollmentSecret' field of newUserDetails,
            //  the same password is returned by "register".
            //  if a password was not set in 'enrollmentSecret' field of newUserDetails,
            //  then a generated password is returned by "register".
            console.log('\n Secret returned: ' + newPwd);
            return newPwd;
        }, error => {
            console.log('Error in register();  ERROR returned: ' + error.toString());
            return Promise.reject(error);
        });
}  //  end of function registerUser



//  function setUserContext
//  Purpose:    to set the context to the user (who called this api) so that ACLs can be applied
//              for that user inside chaincode. All subsequent calls using that gateway / contract
//              will be on this user's behalf.
//  Input:      userid - which has been registered and enrolled earlier (so that certificates are
//              available in the wallet)
//  Output:     no explicit output;  (Global variable) contract will be set to this user's context
utils.setUserContext = async (userid, pwd) => {
    console.log('\n>>>setUserContext...');

    // It is possible that the user has been registered and enrolled in Fabric CA earlier
    // and the certificates (in the wallet) could have been removed.
    // Note that this case is not handled here.

    // Verify if user is already enrolled
    const userExists = await wallet.exists(userid);
    if (!userExists) {
        console.log("An identity for the user: " + userid + " does not exist in the wallet");
        console.log('Enroll user before retrying');
        throw ("Identity does not exist for userid: " + userid);
    }

    try {
        // Connect to gateway using application specified parameters
        console.log('Connect to Fabric gateway with userid:' + userid);
        let userGateway = new Gateway();
        await userGateway.connect(ccp, { identity: userid, wallet: wallet, discovery: { enabled: true, asLocalhost: bLocalHost } });

        network = await userGateway.getNetwork(configdata["channel_name"]);
        contract = await network.getContract(configdata["smart_contract_name"]);

        return contract;
    }
    catch (error) { throw (error); }
}  //  end of setUserContext(userid)


//  function getUser
//  Purpose: get specific registered user
utils.getUser = async (userid, adminIdentity) => {
    console.log(">>>getUser...");
    const gateway = new Gateway();
    // Connect to gateway as admin
    await gateway.connect(ccp, { wallet, identity: adminIdentity, discovery: { enabled: false, asLocalhost: bLocalHost } });
    let client = gateway.getClient();
    let fabric_ca_client = client.getCertificateAuthority();
    let idService = fabric_ca_client.newIdentityService();
    let user = await idService.getOne(userid, gateway.getCurrentIdentity());
    let result = {"id": userid};

    // for admin, usertype is "admin";
    if (userid == "admin") {
        result.usertype = userid;
    } else { // look through user attributes for "usertype"
        let j = 0;
        while (user.result.attrs[j].name !== "usertype") j++;
            result.usertype = user.result.attrs[j].value;
    }
    console.log (result);
    return Promise.resolve(result);
}  //  end of function getUser


//  function getRandomNum
//  Purpose: Provide a random tracking number for the createShipment transaction
utils.getRandomNum = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
    return `${s4()}${s4()}${s4()}${s4()}`


    
}

utils.enrollUser = async (userid, userpwd, usertype) => {
    console.log("\n------------  utils.enrollUser -----------------");
    console.log("userid: " + userid + ", pwd: " + userpwd + ", usertype:" + usertype);

    // get certificate authority
    const orgs = ccp.organizations;
    const CAs = ccp.certificateAuthorities;
    const fabricCAKey = orgs[orgMSPID].certificateAuthorities[0];
    const caURL = CAs[fabricCAKey].url;
    const ca = new FabricCAServices(caURL, { trustedRoots: [], verify: false });

    var newUserDetails = {
        enrollmentID: userid,
        enrollmentSecret: userpwd,
        attrs: [
            {
                "name": "usertype", // application role
                "value": usertype,
                "ecert": true
            }]
    };

    return ca.enroll(newUserDetails).then(enrollment => {
        //console.log("\n Successful enrollment; Data returned by enroll", enrollment.certificate);
        var identity = X509WalletMixin.createIdentity(orgMSPID, enrollment.certificate, enrollment.key.toBytes());
        return wallet.import(userid, identity).then(notused => {
            return console.log('msg: Successfully enrolled user, ' + userid + ' and imported into the wallet');
        }, error => {
            console.log("error in wallet.import\n" + error.toString());
            throw error;
        });
    }, error => {
        console.log("Error in enrollment " + error.toString());
        throw error;
    });
}

module.exports = utils;
