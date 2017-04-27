import { Student } from './objects';

document.querySelector('#something').innerHTML = Student.greeter(new Student("Janek", "M.", "KUser"));
