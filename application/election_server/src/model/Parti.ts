import { Object, Property } from 'fabric-contract-api';

@Object()
export class Parti {
    
    @Property()
    public id: string;
    @Property()
    public name: string;
    @Property()
    public type: string;

    constructor(name: string) {
        this.id =  Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        this.name = name;
        this.type = 'parti';
    }
}