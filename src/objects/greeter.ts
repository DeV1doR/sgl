interface Person {
    firstName: string;
    lastName: string;
}

export class Student {
    fullName: string;

    constructor(public firstName: string, public middleInitial: string, public lastName: string) {
        this.fullName = firstName + " " + middleInitial + " " + lastName;
    }

    static greeter(person : Person): string {
        return "Hello, " + person.firstName + " " + person.lastName;
    }

}
