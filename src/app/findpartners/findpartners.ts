import {Component, ChangeDetectionStrategy, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService} from '../services/findpartner.service';
import { AuthService } from '../services';
import { UserService } from '../services/supabase.service';
import {BehaviorSubject, forkJoin} from 'rxjs'; // Import FormsModule

// Interface for a study partner
interface User {
  userid: string;
  username: string | "unknown";
  email: string | "unknowne";
  role: string;
  status: string;
  bio: string;
  degreeid: number;
  yearofstudy: number;
}

interface UserCourse {
  userid: string;
  courseCode: string;
}

interface Module{
  courseCode: string;
  course_name: string;
  facultyid: number;
}

interface Degree {
  degreeid: number;
  degree_name: string;
  degree_type: string;
  facultyid: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './findpartners.html',
  styleUrls: ['./findpartners.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FindPartners implements OnInit {
  // Dummy data
  partners: User[] = [];
  userCourses: UserCourse[] = [];
  modules: Module[] = [];
  degrees: Degree[] = [];
  data: any;
  isLoading$ = new BehaviorSubject<boolean>(true);
  isLoading = this.isLoading$.asObservable();
  user: any;
  currentUser = [];
  userName = '';
  userId: string | undefined = '';
  tester: any;

  constructor(private apiService: ApiService,
              private authService: AuthService,
              private userService: UserService
  ) { }

  // Properties for filtering state
  searchTerm: string = '';
  selectedDegree: string = 'All';

  // The final list of partners to display
  filteredPartners: User[] = [];

  ngOnInit() {
    //this.populateDummyData();
    // const currentUserId = 0;
    // this.authService.currentUser$.subscribe(user => {
    //   this.currentUser = user;
    // });

    // Trigger initial load
    this.authService.getCurrentUser()
      .then(result => {this.user = result;
        this.userId = result.data.user?.id; //works
        console.log('lklk', result);
      }); //Then add this to your ngOnInit() function in your component

    this.userService.getUserById('7afa86ff-8c02-4f3d-9bdd-f50ed80193e2')
      .then(result => {this.tester = result;
        console.log('tested', result.name);
      });
    this.populateData();
  }

  /**
   * Main filtering logic that updates the displayed partners.
   */
  applyFilters() {
    // Start with only active partners
    let tempPartners = this.partners.filter(p => p.status);

    // 1. Filter by the search term (case-insensitive)
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const lowercasedTerm = this.searchTerm.toLowerCase();
      tempPartners = tempPartners.filter(partner =>
        // Check against username
        partner.username.toLowerCase().includes(lowercasedTerm) ||
        // Check against degree name
        this.getDegreeName(partner.degreeid).toLowerCase().includes(lowercasedTerm) ||
        // Check against any of their course names
        this.getPartnerCourses(partner.userid).some(course =>
          course.course_name.toLowerCase().includes(lowercasedTerm)
        )
      );
    }

    // 2. Filter by the selected degree
    if (this.selectedDegree !== 'All') {
      // FIX: Convert selectedDegree from string to number for correct comparison
      tempPartners = tempPartners.filter(partner => partner.degreeid === Number(this.selectedDegree));
    }

    this.filteredPartners = tempPartners;
    this.isLoading$.next(false);
  }

   async populateData() {
    const apiCalls = forkJoin({
      degrees: this.apiService.getDegree(),
      modules: this.apiService.getModule(),
      userCourses: this.apiService.getUserCourse(),
      partners: this.apiService.getUser()
    });

    apiCalls.subscribe(
      (results) => {
        // All API calls completed successfully
        this.degrees = results.degrees;
        this.modules = results.modules;
        this.userCourses = results.userCourses;
        this.partners = results.partners; //this does not contain username (i.e. result.name) and email

        //this.partners = results.partners;

        // this.partners = [
        //   { userid: "user123", username: 'Alice', email: 'alice@example.com', role: 'student', status: "active", bio: 'Loves algorithms and problem-solving.', degreeid: 9, yearofstudy: 2 },
        //   { userid: "user124", username: 'Bob', email: 'bob@example.com', role: 'student', status: "active", bio: 'Keen on web development and design.', degreeid: 9, yearofstudy: 3 },
        //   { userid: "user125", username: 'Charlie', email: 'charlie@example.com', role: 'student', status: "active", bio: 'Hardware enthusiast, building my own PC.', degreeid: 9, yearofstudy: 1 },
        //   { userid: "user126", username: 'Diana', email: 'diana@example.com', role: 'student', status: "active", bio: 'Future accountant, loves spreadsheets.', degreeid: 9, yearofstudy: 2 },
        //   { userid: "user127", username: 'Eve', email: 'eve@example.com', role: 'student', status: "active", bio: 'Exploring the intersection of art and tech.', degreeid: 9, yearofstudy: 4 }
        // ];

        console.log('All data fetched successfully');
        console.log( this.degrees);
        this.applyFilters();
      },
      (error) => {
        console.error('One or more API calls failed:', error);
      }
    );

    // this.apiService.getDegree().subscribe(
    //   (response) => {
    //     this.degrees = response;
    //     console.log('Data fetched:', this.degrees);
    //   },
    //   (error) => {
    //     console.error('API Error:', error);
    //   }
    // );
    //
    // this.apiService.getModule().subscribe(
    //   (response) => {
    //     this.modules = response;
    //     console.log('Data fetched:', this.modules);
    //   },
    //   (error) => {
    //     console.error('API Error:', error);
    //   }
    // );
    //
    // this.partners = [
    //   { userid: 0, username: 'Alice', email: 'alice@example.com', role: 'student', is_active: true, bio: 'Loves algorithms and problem-solving.', degreeid: 9, yearofstudy: 2 },
    //   { userid: 2, username: 'Bob', email: 'bob@example.com', role: 'student', is_active: true, bio: 'Keen on web development and design.', degreeid: 9, yearofstudy: 3 },
    //   { userid: 3, username: 'Charlie', email: 'charlie@example.com', role: 'student', is_active: false, bio: 'Hardware enthusiast, building my own PC.', degreeid: 9, yearofstudy: 1 },
    //   { userid: 4, username: 'Diana', email: 'diana@example.com', role: 'student', is_active: true, bio: 'Future accountant, loves spreadsheets.', degreeid: 9, yearofstudy: 2 },
    //   { userid: 5, username: 'Eve', email: 'eve@example.com', role: 'student', is_active: false, bio: 'Exploring the intersection of art and tech.', degreeid: 9, yearofstudy: 4 }
    // ];
    //
    // this.apiService.getUserCourse().subscribe(
    //   (response) => {
    //     this.userCourses = response;
    //
    //     console.log('Data load:', this.userCourses);
    //     this.isLoading$.next(false);
    //     console.log('Data load:', this.isLoading);
    //   },
    //   (error) => {
    //     console.error('API Error:', error);
    //   }
    // );
  } //Add this function to auth.service.ts

  getDegreeName(degreeId: number): string {
    const degree = this.degrees.find(d => d.degreeid === degreeId);
    console.log("hiooo", degree);
    return degree ? degree.degree_name : 'Unknown Degree';
  }

  getPartnerCourses(partnerId: string): Module[] {
    const partnerCourseCodes = this.userCourses
      .filter(uc => uc.userid === partnerId)
      .map(uc => uc.courseCode);

    return this.modules.filter(m => partnerCourseCodes.includes(m.courseCode));
  }

  getInitials(username: string): string {
    return username ? username.charAt(0).toUpperCase() : '?';
  }

  getAvatarColor(username: string): string {
    const colors = ['#007BFF', '#6f42c1', '#28a745', '#dc3545', '#ffc107', '#17a2b8'];
    if (!username) return colors[0];
    const charCodeSum = username.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charCodeSum % colors.length];
  }

  getYearOfStudy(year: number): string {
    switch (year) {
      case 1: return '1st Year';
      case 2: return '2nd Year';
      case 3: return '3rd Year';
      case 4: return '4th Year';
      default: return `${year}th Year`;
    }
  }
}
