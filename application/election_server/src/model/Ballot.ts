import {Object, Property} from 'fabric-contract-api';

@Object()
export class Ballot {

    @Property()
    public id: string;
    @Property()
    public ballotCast: boolean;
    @Property()
    public electionId: string;
    @Property()
    public type: string;

    constructor(electionId: string) {
        this.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        this.ballotCast = false;
        this.electionId = electionId;
        this.type = 'ballot';
        return this;
    }
}
