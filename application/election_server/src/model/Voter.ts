import { Object, Property } from 'fabric-contract-api';

@Object()
export class Voter {

    @Property()
    public id: string;
    @Property()
    public email: string;
    @Property()
    public cin: string;
    @Property()
    public firstName: string;
    @Property()
    public secondName: string;
    @Property()
    public identificationCardRecto: string;
    @Property()
    public identificationCardVerso: string;
    @Property()
    public areaId: string;
    @Property()
    public ballotId: string;
    @Property()
    public authorized: boolean;
    @Property()
    public rejected: boolean;
    @Property()
    public voted: boolean;
    @Property()
    public type: string;

    // zat5yhj0gphpy7fnubzed

    constructor(email: string, cin: string, firstName: string, secondName: string, identificationCardRecto: string, identificationCardVerso: string, areaId: string, ballotId: string) {
        this.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        this.email = email;
        this.cin = cin;
        this.firstName = firstName;
        this.secondName = secondName;
        this.identificationCardRecto = identificationCardRecto;
        this.identificationCardVerso = identificationCardVerso;
        this.areaId = areaId;
        this.ballotId = ballotId;
        this.authorized = false;
        this.rejected = false;
        this.voted = false;
        this.type = 'voter';
        return this;
    }
}
