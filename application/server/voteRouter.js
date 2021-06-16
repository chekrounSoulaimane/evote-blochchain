/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
'use strict';
const express = require('express');
const utils = require('./utils.js');
const voteRoute = express.Router();

// Bring key classes into scope, most importantly Fabric SDK network class

const STATUS_SUCCESS = 200;
const STATUS_CLIENT_ERROR = 400;
const STATUS_SERVER_ERROR = 500;

//  USER Management Errors
const USER_NOT_ENROLLED = 1000;
const INVALID_HEADER = 1001;

//  application specific errors
const SUCCESS = 0;
const ORDER_NOT_FOUND = 2000;

async function getUsernamePassword(request) {
    // check for basic auth header
    if (!request.headers.authorization || request.headers.authorization.indexOf('Basic ') === -1) {
        return new Promise().reject('Missing Authorization Header');  //  status 401
    }

    // get auth credentials
    const base64Credentials = request.headers.authorization.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    //  At this point, username + password could be verified for auth -
    //  but NOT BEING VERIFIED here.  Username and password are
    //  verified with Fabric-Certificate-Authority at enroll-user time.
    //  Once enrolled,
    //  certificate is retrieved from CA and stored in local wallet.
    //  After that, password will not be used.  username will be used
    //  to pick up certificate from the local wallet.

    if (!username || !password) {
        return new Promise().reject('Invalid Authentication Credentials');  //  status 401
    }

    // attach username and password to request object
    request.username = username;
    request.password = password;

    return request;
}

async function submitTx(request, txName, ...args) {
    try {
        //  check header; get username and pwd from request
        //  does NOT verify auth credentials
        console.log("myargs1"+args);
        await getUsernamePassword(request);
        return utils.setUserContext(request.username, request.password).then((contract) => {
            // Insert txName as args[0]
            args.unshift(txName);
            // Insert contract as args[0]
            args.unshift(contract);
            // .apply applies the list entries as parameters to the called function
            console.log("myargs2"+args);
            return utils.submitTx.apply("unused", args)
                .then(buffer => {
                    return buffer;
                }, error => {
                    return Promise.reject(error);
                });
        }, error => {
            return Promise.reject(error);
        });
    }
    catch (error) {
        return Promise.reject(error);
    }
}


// createElection
voteRoute.route('/create-election').post(function (request, response) {
    console.log("Request*******************  " + request.body.name , request.body.startDate, request.body.endDate);
    submitTx(request, 'createElection', request.body.name, request.body.year.toString(), request.body.startDate, request.body.endDate)
        .then((result) => {
            //  response is already a string;  not a buffer
            let election = result;
            response.status(STATUS_SUCCESS);
            response.send(election);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem creating the new election."));
        });
});

// createArea
voteRoute.route('/create-area').post(function (request, response) {
    console.log("Request******************* id: " + ", name: " + request.body.name);
    submitTx(request, 'createArea', '1', request.body.name)
        .then((result) => {
            //  response is already a string;  not a buffer
            let area = result;
            response.status(STATUS_SUCCESS);
            response.send(area);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem creating the new area."));
        });
});

voteRoute.route('/create-parti').post(function (request, response) {
    console.log("Request******************* id: " + ", name: " + request.body.name);
    submitTx(request, 'createParti', "tfoo", request.body.name)
        .then((result) => {
            //  response is already a string;  not a buffer
            let parti = result;
            response.status(STATUS_SUCCESS);
            response.send(parti);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem creating the new area."));
        });
});

// createCandidat
voteRoute.route('/create-candidat').post(function (request, response) {
    console.log("Request******************* electionId : " + request.body.electionId + ", description: " + request.body.description + ", nomSGP: " + request.body.nomSGP + ", prenomSGP: " + request.body.prenomSGP + ", areaId: " + request.body.areaId + ", partiId: " + request.body.partiId);
    submitTx(request, 'createCandidat', request.body.electionId, request.body.description, request.body.nomSGP, request.body.prenomSGP, request.body.areaId, request.body.partiId)
        .then((result) => {
            //  response is already a string;  not a buffer
            let candidat = result;
            response.status(STATUS_SUCCESS);
            response.send(candidat);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem creating the new candidat."));
        });
});

// Not Working (Error: Expected 2 parameters, but 1 have been supplied)
// createVoter
// should add the email and other informations about the voter!
voteRoute.route('/create-voter').post(function (request, response) {
    console.log("Request*******************  areaId: " + request.body.areaId );
    submitTx(request, 'createVoter',  request.body.areaId, request.body.email)
        .then((result) => {
            //  response is already a string;  not a buffer
            let voter = result;
            response.status(STATUS_SUCCESS);
            response.send(voter);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem creating the new voter."));
        });
});
 
// getAllCandidatsByArea
voteRoute.route('/get-all-candidats-by-area/:areaId').get(function (request, response) {
    submitTx(request, 'getAllCandidatsByArea', request.params.areaId)
        .then((result) => {
            //  response is already a string;  not a buffer
            let candidats = result;
            response.status(STATUS_SUCCESS);
            response.send(candidats);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem getting the Candidats by Area id " + request.body.areaId));
        });
});  

// // getAllCandidatsByAreaAndElection
// voteRoute.route('/get-all-candidats-by-area-and-election').get(function (request, response) {
//     submitTx(request, 'getAllCandidatsByAreaAndElection', request.body.areaId, request.body.electionId)
//         .then((result) => {
//             //  response is already a string;  not a buffer
//             let candidats = result;
//             response.status(STATUS_SUCCESS);
//             response.send(candidats);
//         }, (error) => {
//             response.status(STATUS_SERVER_ERROR);
//             response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
//                 "There was a problem getting the candidats by Area id " + request.body.areaId + "and election id " + request.body.electionId));
//         });
// });  

// not working (You've asked to invoke a function that does not exist: getAllUnauthorizedVoters)
// Not compiled in the blockchain server!
// getAllUnauthorizedVoters
voteRoute.route('/get-all-unauthorized-voters').get(function (request, response) {
    submitTx(request, 'getAllUnauthorizedVoters')
        .then((result) => {
            //  response is already a string;  not a buffer
            let unauthorizedVoters = result;
            response.status(STATUS_SUCCESS);
            response.send(unauthorizedVoters);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem getting the unauthorized voters."));
        });
});  

// Not working (You've asked to invoke a function that does not exist: getCandidatsByUserId)
// Not compiled in the blockchain server!
// getCandidatsByUserId
voteRoute.route('/get-candidats-by-user-id/:voterId').get(function (request, response) {
    submitTx(request, 'getCandidatsByUserId', request.params.voterId)
        .then((result) => {
            //  response is already a string;  not a buffer
            let candidats = result;
            response.status(STATUS_SUCCESS);
            response.send(candidats);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem getting Candidats By User Id " + request.params.voterId ));
        });
});  

// Not working (You've asked to invoke a function that does not exist: getElectionResults)
// Not compiled in the blockchain server!
// getElectionResults
voteRoute.route('/get-election-results/:electionId').get(function (request, response) {
    submitTx(request, 'getElectionResults', request.params.electionId)
        .then((result) => {
            //  response is already a string;  not a buffer
            let electionResults = result;
            response.status(STATUS_SUCCESS);
            response.send(electionResults);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem getting election Results of the election " + request.params.electionId));
        });
});  

// Not working (You've asked to invoke a function that does not exist: authorizeVoter)
// Not compiled in the blockchain server!
// authorizeVoter
voteRoute.route('/authorize-voter/:voterId').post(function (request, response) {
    submitTx(request, 'authorizeVoter', request.params.voterId)
        .then((result) => {
            //  response is already a string;  not a buffer
            let authorizeVoter = result;
            response.status(STATUS_SUCCESS);
            response.send(authorizeVoter);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem authorizing the voter " + request.body.voterId));
        });
});  

// castVote
voteRoute.route('/cast-vote').post(function (request, response) {
    submitTx(request, 'castVote', request.body.picked, request.body.electionId, request.body.voterId)
        .then((result) => {
            //  response is already a string;  not a buffer
            let authorizeVoter = result;
            response.status(STATUS_SUCCESS);
            response.send(authorizeVoter);
        }, (error) => {
            response.status(STATUS_SERVER_ERROR);
            response.send(utils.prepareErrorResponse(error, STATUS_SERVER_ERROR,
                "There was a problem casting the vote."));
        });
});  

module.exports = voteRoute;
