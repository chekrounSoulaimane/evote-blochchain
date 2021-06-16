import { Object, Property } from 'fabric-contract-api';

@Object()
export class Election {

    @Property()
    public id: string;
    @Property()
    public name: string;
    @Property()
    public year: number;
    @Property()
    public startDate: string;
    @Property()
    public endDate: string;
    @Property()
    public type: string;

    constructor(name: string, year: number, startDate: string, endDate: string) {
        this.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        this.name = name;
        this.year = year;
        this.startDate = startDate;
        this.endDate = endDate;
        this.type = 'election';
        return this;
    }
}

