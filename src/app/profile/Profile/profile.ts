import { Component } from '@angular/core';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class Profile {
  profilePicture = 'assets/profile.jpg';
  name = 'Jane Doe';
  degree = 'B.Sc. Computer Science';
  university = 'Example University';
  location = 'San Francisco, CA';
  bio = 'Frontend developer who loves building clean and functional user interfaces.';
}
