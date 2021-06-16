import { Object, Property } from 'fabric-contract-api';

@Object()
export class Candidat {

    @Property()
    public id: string;
    @Property()
    public firstName: string;
    @Property()
    public secondName: string;
    @Property()
    public description: string;
    @Property()
    public electionId: string;
    @Property()
    public areaId: string;
    @Property()
    public partiId: string;
    @Property()
    public count: number;
    @Property()
    public type: string;

    constructor(firstName: string, secondName: string, description: string, electionId: string, areaId: string, partiId: string) {
        this.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        this.firstName = firstName;
        this.secondName = secondName;
        this.description = description;
        this.electionId = electionId;
        this.areaId = areaId;
        this.partiId = partiId;
        this.count = 0;
        this.type = 'candidat';
        return this;
    }
}
