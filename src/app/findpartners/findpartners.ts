import {Component, ChangeDetectionStrategy, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { ApiService } from '../services/api.service';

// Interface for a study partner
interface User {
  userid: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  bio: string;
  degreeid: string;
  yearofstudy: number;
}

interface UserCourse {
  userid: number;
  courseCode: string;
}

interface Module{
  courseCode: string;
  course_name: string;
  faculty_id: number;
}

interface Degree {
  degreeid: string;
  degree_name: string;
  degree_type: string;
  faculty: string;
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

  constructor(private apiService: ApiService) { }

  // Properties for filtering state
  searchTerm: string = '';
  selectedDegree: string = 'All';

  // The final list of partners to display
  filteredPartners: User[] = [];

  ngOnInit() {
    this.populateDummyData();
    this.applyFilters(); // Initial filter application
    this.apiService.getData().subscribe(
      (response) => {
        this.data = response;
        console.log('Data fetched:', this.data);
      },
      (error) => {
        console.error('API Error:', error);
      }
    );
  }

  /**
   * Main filtering logic that updates the displayed partners.
   */
  applyFilters() {
    // Start with only active partners
    let tempPartners = this.partners.filter(p => p.is_active);

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
      tempPartners = tempPartners.filter(partner => partner.degreeid === this.selectedDegree);
    }

    this.filteredPartners = tempPartners;
  }

  populateDummyData() {
    this.degrees = [
      { degreeid: 'CS', degree_name: 'Computer Science', degree_type: 'BSc', faculty: 'Science' },
      { degreeid: 'ENG', degree_name: 'Electrical Engineering', degree_type: 'BEng', faculty: 'Engineering' },
      { degreeid: 'BCOM', degree_name: 'Commerce', degree_type: 'BCom', faculty: 'Commerce, Law and Management' },
      { degreeid: 'ART', degree_name: 'Fine Arts', degree_type: 'BA', faculty: 'Humanities' }
    ];

    this.modules = [
      { courseCode: 'COS101', course_name: 'Intro to Programming', faculty_id: 1 },
      { courseCode: 'COS212', course_name: 'Data Structures', faculty_id: 1 },
      { courseCode: 'ELC101', course_name: 'Basic Circuits', faculty_id: 2 },
      { courseCode: 'ACC101', course_name: 'Accounting 1A', faculty_id: 3 },
      { courseCode: 'FIN201', course_name: 'Finance 2', faculty_id: 3 },
      { courseCode: 'ART100', course_name: 'History of Art', faculty_id: 4 }
    ];

    this.partners = [
      { userid: 1, username: 'Alice', email: 'alice@example.com', role: 'student', is_active: true, bio: 'Loves algorithms and problem-solving.', degreeid: 'CS', yearofstudy: 2 },
      { userid: 2, username: 'Bob', email: 'bob@example.com', role: 'student', is_active: true, bio: 'Keen on web development and design.', degreeid: 'CS', yearofstudy: 3 },
      { userid: 3, username: 'Charlie', email: 'charlie@example.com', role: 'student', is_active: false, bio: 'Hardware enthusiast, building my own PC.', degreeid: 'ENG', yearofstudy: 1 },
      { userid: 4, username: 'Diana', email: 'diana@example.com', role: 'student', is_active: true, bio: 'Future accountant, loves spreadsheets.', degreeid: 'BCOM', yearofstudy: 2 },
      { userid: 5, username: 'Eve', email: 'eve@example.com', role: 'student', is_active: false, bio: 'Exploring the intersection of art and tech.', degreeid: 'ART', yearofstudy: 4 }
    ];

    this.userCourses = [
      { userid: 1, courseCode: 'COS101' },
      { userid: 1, courseCode: 'COS212' },
      { userid: 2, courseCode: 'COS212' },
      { userid: 3, courseCode: 'ELC101' },
      { userid: 4, courseCode: 'ACC101' },
      { userid: 4, courseCode: 'FIN201' },
      { userid: 5, courseCode: 'ART100' }
    ];
  }

  getDegreeName(degreeId: string): string {
    const degree = this.degrees.find(d => d.degreeid === degreeId);
    return degree ? degree.degree_name : 'Unknown Degree';
  }

  getPartnerCourses(partnerId: number): Module[] {
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
