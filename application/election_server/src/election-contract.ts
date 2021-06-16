/*
 * SPDX-License-Identifier: Apache-2.0
 */
import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { Area } from './model/Area';
import { Ballot } from './model/ballot';
import { Candidat } from './model/Candidat';
import { Election } from './model/Election';
import { Parti } from './model/Parti';
import { Voter } from './model/voter';

const moment = require('moment');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
require('dotenv').config();


@Info({ title: 'ElectionContract', description: 'My Smart Contract' })
export class ElectionContract extends Contract {

    // voter functions

    @Transaction()
    @Returns('Voter')
    async createVoter(ctx: Context, email: string, cin: string, firstName: string, secondName: string, identificationCardRecto: string, identificationCardVerso: string, areaId: string, electionId: string): Promise<Voter | string> {
        let ballot: Ballot = await this.createBallot(ctx, electionId);
        const newVoter = new Voter(email, cin, firstName, secondName, identificationCardRecto, identificationCardVerso, areaId, ballot.id);
        await ctx.stub.putState(newVoter.id, Buffer.from(JSON.stringify(newVoter)));
        return newVoter;
    }

    @Transaction()
    @Returns('string')
    async authorizeVoter(ctx: Context, id: string): Promise<string> {
        const voterAsBytes = await ctx.stub.getState(id);
        const voter: Voter = await JSON.parse(voterAsBytes.toString()) as Voter;
        if (voter.authorized) {
            return `voter with id ${id} is already authorized`;
        }
        voter.authorized = true;
        await ctx.stub.putState(voter.id, Buffer.from(JSON.stringify(voter)));

        const oauth2Client = new OAuth2(
            process.env.OAUTH_CLIENTID,
            process.env.OAUTH_CLIENT_SECRET,
            'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.OAUTH_REFRESH_TOKEN
        });
        const accessToken = oauth2Client.getAccessToken();

        // send mail to the voter
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.MAIL_USERNAME,
                clientId: process.env.OAUTH_CLIENTID,
                clientSecret: process.env.OAUTH_CLIENT_SECRET,
                refreshToken: process.env.OAUTH_REFRESH_TOKEN,
                accessToken: accessToken
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        var mailOptions = {
            from: process.env.MAIL_USERNAME,
            to: voter.email,
            subject: 'Sending Email using Node.js',
            text: 'you\'ve been authorized. you can vote now.'
        };

        transporter.sendMail(mailOptions, function (error: string, info: string) {
            if (error) {
                console.log('Email sent: ' + error);
            } else {
                console.log('Email sent: ' + info);
            }
        });

        return `voter with id ${id} has been authorized successfully`;
    }

    @Transaction()
    @Returns('string')
    async unauthorizeVoter(ctx: Context, id: string): Promise<string> {
        const voterAsBytes = await ctx.stub.getState(id);
        const voter: Voter = await JSON.parse(voterAsBytes.toString()) as Voter;
        if (!voter.authorized) {
            return `voter with id ${id} is already unauthorized`;
        }
        voter.authorized = false;
        await ctx.stub.putState(voter.id, Buffer.from(JSON.stringify(voter)));
        return `voter with id ${id} has been unauthorized successfully`;
    }

    @Transaction()
    @Returns('string')
    async rejecteVoter(ctx: Context, id: string): Promise<string> {
        const voterAsBytes = await ctx.stub.getState(id);
        const voter: Voter = await JSON.parse(voterAsBytes.toString()) as Voter;
        if (voter.rejected) {
            return `voter with id ${id} is already rejected`;
        }
        voter.rejected = true;
        await ctx.stub.putState(voter.id, Buffer.from(JSON.stringify(voter)));

        return `voter with id ${id} has been rejected successfully`;
    }

    @Transaction()
    @Returns('string')
    async approveVoter(ctx: Context, id: string): Promise<string> {
        const voterAsBytes = await ctx.stub.getState(id);
        const voter: Voter = await JSON.parse(voterAsBytes.toString()) as Voter;
        if (!voter.rejected) {
            return `voter with id ${id} is already approved`;
        }
        voter.rejected = false;
        await ctx.stub.putState(voter.id, Buffer.from(JSON.stringify(voter)));
        return `voter with id ${id} has been approved successfully`;
    }

    @Transaction()
    @Returns('Voter[]')
    async getAllUnauthorizedVoters(ctx: Context): Promise<Voter[] | string> {
        const objectType: string = 'voter';

        const queryString = {
            selector: {
                type: objectType,
                authorized: false,
                rejected: false
            }
        };
        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));

        const unauthorizedVoters: Voter[] = JSON.parse(queryResults) as Voter[];
        return unauthorizedVoters;
    }

    // Election functions

    @Transaction()
    @Returns('Election')
    async createElection(ctx: Context, name: string, year: number, startDate: string, endDate: string): Promise<Election> {
        const election: Election = new Election(name, year, startDate, endDate);
        const buffer: Buffer = Buffer.from(JSON.stringify(election));
        await ctx.stub.putState(election.id, buffer);
        return election;
    }

    @Transaction(false)
    @Returns('Election[]')
    async getCurrentElections(ctx: Context): Promise<Election[] | string> {
        const objectType: string = 'election';
        const currentDate = moment(new Date(), 'DD-MM-YYYY');
        const year: number = new Date().getFullYear();

        const queryString = {
            selector: {
                type: objectType,
                year: year
            }
        };
        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));

        const elections: Election[] = JSON.parse(queryResults) as Election[];
        const availableElections: Election[] = [];
        let j = 0;
        elections.forEach((element) => {
            let startDate = moment(element.startDate, 'DD-MM-YYYY');
            let endDate = moment(element.endDate, 'DD-MM-YYYY');
            if (currentDate.isAfter(startDate) && currentDate.isBefore(endDate)) {
                availableElections[j] = element;
                j++;
            }
        });
        return availableElections;
    }

    // Candidat functions

    @Transaction()
    @Returns('Candidat')
    async createCandidat(ctx: Context, firstName: string, secondName: string, description: string, electionId: string, areaId: string, partiId: string): Promise<Candidat> {
        const candidat: Candidat = new Candidat(firstName, secondName, description, electionId, areaId, partiId);
        const buffer: Buffer = Buffer.from(JSON.stringify(candidat));
        await ctx.stub.putState(candidat.id, buffer);
        return candidat;
    }

    @Transaction(false)
    @Returns('Candidat')
    async getCandidatById(ctx: Context, candidatId: string): Promise<Candidat> {
        const data: Uint8Array = await ctx.stub.getState(candidatId);
        const candidat: Candidat = JSON.parse(data.toString()) as Candidat;
        return candidat;
    }

    @Transaction()
    @Returns('Candidat[]')
    async getElectionResults(ctx: Context, id: string): Promise<Candidat[] | string> {
        const objectType: string = 'candidat';
        const queryString = {
            selector: {
                type: objectType,
                id: id
            }
        };

        const electionAsBytes = await ctx.stub.getState(id);
        const election: Election = await JSON.parse(electionAsBytes.toString()) as Election;

        const currentDate = moment(new Date(), 'DD-MM-YYYY');
        let endDate = moment(election.endDate, 'DD-MM-YYYY');

        if (currentDate.isBefore(endDate)) {
            return `election with id ${id} haven't finished yet.`;
        }
        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));

        const candidats: Candidat[] = JSON.parse(queryResults) as Candidat[];
        return candidats;
    }

    @Transaction(false)
    @Returns('Candidat[]')
    async getAllCandidatsByArea(ctx: Context, areaId: string): Promise<Candidat[]> {
        const objectType: string = 'candidat';

        const queryString = {
            selector: {
                type: objectType,
                areaId: areaId
            }
        };
        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));

        const areaCandidats: Candidat[] = JSON.parse(queryResults) as Candidat[];
        return areaCandidats;
    }

    @Transaction(false)
    @Returns('Candidat[]')
    async getAllCandidatsByAreaAndElection(ctx: Context, areaId: string, electionId: string): Promise<Candidat[]> {
        const objectType: string = 'candidat';

        const queryString = {
            selector: {
                type: objectType,
                areaId: areaId,
                electionId: electionId
            }
        };
        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));

        const areaCandidats: Candidat[] = JSON.parse(queryResults) as Candidat[];
        return areaCandidats;
    }

    // Ballot functions

    @Transaction()
    @Returns('Ballot')
    async createBallot(ctx: Context, electionId: string): Promise<Ballot> {
        const ballot: Ballot = new Ballot(electionId);
        const buffer: Buffer = Buffer.from(JSON.stringify(ballot));
        await ctx.stub.putState(ballot.id, buffer);
        return ballot;
    }

    @Transaction(false)
    @Returns('Ballot')
    async getBallotById(ctx: Context, ballotId: number): Promise<Ballot> {
        const objectType: string = 'ballot';

        const queryString = {
            selector: {
                type: objectType,
                ballotId: ballotId
            }
        };
        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));

        const voterBallot: Ballot = JSON.parse(queryResults) as Ballot;
        return voterBallot;
    }

    // Area functions

    @Transaction()
    @Returns('Area')
    async createArea(ctx: Context, name: string): Promise<Area> {
        const area: Area = new Area(name);
        const buffer: Buffer = Buffer.from(JSON.stringify(area));
        await ctx.stub.putState(area.id, buffer);
        return area;
    }

    // Parti functions

    @Transaction()
    @Returns('Parti')
    async createParti(ctx: Context, name: string): Promise<Parti> {
        const parti: Parti = new Parti(name);
        const buffer: Buffer = Buffer.from(JSON.stringify(parti));
        await ctx.stub.putState(parti.id, buffer);
        return parti;
    }

    // other functions

    @Transaction()
    @Returns('string')
    async castVote(ctx: Context, candidatId: string, electionId: string, voterId: string): Promise<string> {
        
        const electionExists = await this.myAssetExists(ctx, electionId);
        if (electionExists) {
            
            const electionAsBytes = await ctx.stub.getState(electionId);
            // @ts-ignore
            const election = await JSON.parse(electionAsBytes);
            console.log('this is voter id', voterId);
            const voterAsBytes = await ctx.stub.getState(voterId);
            // @ts-ignore
            const voter = await JSON.parse(voterAsBytes) as Voter;
            const ballotAsBytes = await ctx.stub.getState(voter.ballotId);
            // @ts-ignore
            const ballot = await JSON.parse(ballotAsBytes) as Ballot;
            console.log('this voter', voter);
            // ballotCast ==> voter voted
            if (ballot.ballotCast) {
                const response = 'this voter has already cast this ballot!';
                return response;
            }

            // check the date of the election, to make sure the election is still open
            
            const currentDate = moment(new Date(), 'DD-MM-YYYY');

            let startDate = moment(election.startDate, 'DD-MM-YYYY');
            let endDate = moment(election.endDate, 'DD-MM-YYYY');
            
            console.log('start date', startDate);
            console.log('end date', endDate);
            if (currentDate.isAfter(startDate) && currentDate.isBefore(endDate)) {

                const candidatExists = await this.myAssetExists(ctx, candidatId);
                if (!candidatExists) {
                    // tslint:disable-next-line:no-shadowed-variable
                    const response = 'VotableId does not exist!';
                    return response;
                }

                // get the votable object from the state - with the votableId the user candidatId
                const candidatAsBytes = await ctx.stub.getState(candidatId);
                // @ts-ignore
                const candidat = await JSON.parse(candidatAsBytes) as Candidat;

                // increase the vote of the political party that was candidatId by the voter
                candidat.count++;

                // update the state with the new vote count
                const result = await ctx.stub.putState(candidatId, Buffer.from(JSON.stringify(candidat)));
                console.log('result', result);

                // make sure this voter cannot vote again!
                ballot.ballotCast = true;

                // update state to say that this voter has voted, and who they candidatId
                const response = await ctx.stub.putState(voter.id, Buffer.from(JSON.stringify(voter)));
                console.log(response);
                return "Voted successfully";

            } else {
                const response = 'the election is not open now!';
                return response;
            }

        } else {
            const response = 'the election or the voter does not exist!';
            return response;
        }
    }

    @Transaction()
    @Returns('Ballot')
    async setVoterStatus(ctx: Context, id: string, status: boolean): Promise<Ballot> {
        const voterAsBytes = await ctx.stub.getState(id);
        // @ts-ignore
        const voter: Voter = await JSON.parse(voterAsBytes) as Voter;
        console.log('this is voter', voter);
        const ballotAsBytes = await ctx.stub.getState(voter.ballotId);
        // @ts-ignore
        const ballot: Ballot = await JSON.parse(ballotAsBytes) as Ballot;
        ballot.ballotCast = status;
        await ctx.stub.putState(ballot.id, Buffer.from(JSON.stringify(ballot)));
        return ballot;
    }

    // utils functions

    @Transaction(false)
    @Returns('boolean')
    public async myAssetExists(ctx: Context, myAssetId: string): Promise<boolean> {
        const data: Uint8Array = await ctx.stub.getState(myAssetId);
        return (!!data && data.length > 0);
    }

    @Transaction(false)
    @Returns('any')
    async readMyAsset(ctx: Context, myAssetId: string): Promise<any> {

        const exists = await this.myAssetExists(ctx, myAssetId);

        if (!exists) {
            // throw new Error(`The my asset ${myAssetId} does not exist`);
            const response = {
                error: ''
            };
            response.error = `The my asset ${myAssetId} does not exist`;
            return response;
        }

        const buffer = await ctx.stub.getState(myAssetId);
        const asset = JSON.parse(buffer.toString());
        return asset;
    }

    @Transaction()
    @Returns('string')
    async deleteState(ctx: Context, key: string): Promise<string> {
        await ctx.stub.deleteState(key);
        return 'work';
    }

    @Transaction(false)
    @Returns('any')
    public async queryWithQueryString(ctx: Context, queryString: string): Promise<any> {

        const resultsIterator = await ctx.stub.getQueryResult(queryString);

        const allResults = [];

        while (true) {
            const res = await resultsIterator.next();

            if (res.value && res.value.value.toString()) {
                let jsonRes: any;


                try {
                    jsonRes = JSON.parse((res.value.value as Buffer).toString('utf8'));
                } catch (err) {
                    console.log(err);
                    jsonRes.Record = (res.value.value as Buffer).toString('utf8');
                }

                allResults.push(jsonRes);
            }
            if (res.done) {
                console.log('end of data');
                await resultsIterator.close();
                console.info(allResults);
                console.log(JSON.stringify(allResults));
                return JSON.stringify(allResults);
            }
        }
    }

    @Transaction(false)
    @Returns('any')
    public async queryByObjectType(ctx: Context, objectType: string): Promise<any> {
        const queryString = {
            selector: {
                type: objectType
            }
        };
        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));
        return queryResults;

    }

    @Transaction(false)
    @Returns('any')
    public async queryAll(ctx: Context): Promise<any> {

        const queryString = {
            selector: {}
        };

        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));
        return queryResults;

    }
}
