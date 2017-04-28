interface Person {
    firstName: string;
    middleInitial: string;
    lastName: string;
    greet(): string;
}

export class Student implements Person {
    fullName: string;

    constructor(public firstName: string, public middleInitial: string, public lastName: string) {
        this.fullName = firstName + " " + middleInitial + " " + lastName;
    }

    public greet(): string {
        return `Hello, ${this.firstName} ${this.lastName}`;
    }

}
