import {Component, ChangeDetectionStrategy, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService} from '../services/findpartner.service';
import { AuthService } from '../services';
import { UserService } from '../services/supabase.service';
import {BehaviorSubject, forkJoin, of} from 'rxjs';
import { catchError } from 'rxjs/operators';

// Interface for a study partner
interface User {
  userid: string;
  username: string | "unknown";
  email: string | "unknown";
  role: string;
  status: string;
  bio: string;
  degreeid: number;
  yearofstudy: number;
}

// Interface for a Supabase user
interface SupabaseUser {
  id: string;
  email: string;
  name: string;
  user_metadata: {
    [key: string]: any; // Keep metadata flexible
  };
}

interface UserCourse {
  userid: string;
  courseCode: string;
}

interface Module{
  courseCode: string;
  courseName: string;
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
  partners: User[] = [];
  userCourses: UserCourse[] = [];
  modules: Module[] = [];
  degrees: Degree[] = []; // This holds ALL degrees from the API
  availableDegreesForFilter: Degree[] = []; // This will hold only relevant degrees for the dropdown
  isLoading$ = new BehaviorSubject<boolean>(true);
  isLoading = this.isLoading$.asObservable();
  user: any;
  userId: string | undefined = '';
  tester: any;

  // Properties for filtering state
  searchTerm: string = '';
  selectedDegree: string = 'All';

  // The final list of partners to display
  filteredPartners: User[] = [];

  constructor(private apiService: ApiService,
              private authService: AuthService,
              private userService: UserService
  ) { }

  ngOnInit() {
    this.isLoading$.next(true);

    this.authService.getCurrentUser()
      .then(result => {
        this.user = result;
        this.userId = result.data.user?.id;

        if (this.userId) {
          this.populateData(this.userId);
        } else {
          console.error("Could not determine current user. Data cannot be loaded.");
          this.isLoading$.next(false);
        }
      })
      .catch(err => {
        console.error("Error getting current user:", err);
        this.isLoading$.next(false);
      });
  }

  /**
   * Fetches all data from APIs and then applies initial filters.
   * @param currentUserId The ID of the currently logged-in user.
   */
  populateData(currentUserId: string) {
    const apiCalls = forkJoin({
      degrees: this.apiService.getDegree().pipe(catchError(() => of([]))),
      modules: this.apiService.getModule().pipe(catchError(() => of([]))),
      allUserCourses: this.apiService.getAllUserCourses().pipe(catchError(() => of([]))),
      partners: this.apiService.getUser().pipe(catchError(() => of([]))),
      supabaseUsers: this.userService.getAllUsers()
    });

    apiCalls.subscribe((results) => {
        this.degrees = results.degrees;
        this.modules = results.modules;
        this.userCourses = results.allUserCourses;

        // Create a Map for quick lookups of Supabase user data.
        const supabaseUserMap = new Map<string, { username: string; email: string }>();
        results.supabaseUsers.forEach((user: SupabaseUser) => {
          const username = user.name || 'Unknown User';
          const email = user.email || 'No email';
          supabaseUserMap.set(user.id, { username, email });
        });

        const validatedPartners = results.partners.filter((partner: User) => supabaseUserMap.has(partner.userid));

        const mergedPartners = validatedPartners.map((partner: User) => {
          const supabaseInfo = supabaseUserMap.get(partner.userid)!;
          return {
            ...partner,
            username: supabaseInfo.username,
            email: supabaseInfo.email
          };
        });

        this.partners = mergedPartners.filter((partner: User) => partner.userid !== currentUserId);

        // Calculate which degrees are actually represented in the final partner list.
        const availableDegreeIds = new Set(this.partners.map(p => p.degreeid));
        this.availableDegreesForFilter = this.degrees.filter(d => availableDegreeIds.has(d.degreeid));

        console.log('All data fetched and merged successfully');
        this.applyFilters();
      },
      (error) => {
        console.error('One or more API calls failed:', error);
        this.isLoading$.next(false);
      }
    );
  }


  /**
   * Main filtering logic that updates the displayed partners.
   */
  applyFilters() {
    // Start with only active partners
    let tempPartners = this.partners.filter(p => p.status === 'active');

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
          course.courseName.toLowerCase().includes(lowercasedTerm)
        )
      );
    }

    // 2. Filter by the selected degree
    if (this.selectedDegree !== 'All') {
      tempPartners = tempPartners.filter(partner => partner.degreeid === Number(this.selectedDegree));
    }

    this.filteredPartners = tempPartners;
    this.isLoading$.next(false);
  }

  getDegreeName(degreeId: number): string {
    // ✅ FIXED: Removed extra dot before .find()
    const degree = this.degrees.find(d => d.degreeid === degreeId);
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

