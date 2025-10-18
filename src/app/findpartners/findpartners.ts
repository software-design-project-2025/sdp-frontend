import { Component, ChangeDetectionStrategy, OnInit, inject, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService} from '../services/findpartner.service';
import { UserApiService } from '../services/user.service';
import { AuthService } from '../services';
import { UserService } from '../services/supabase.service';
import { ChatService } from '../services/chat.service';
import { BehaviorSubject, firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Router } from '@angular/router';

// --- SANITIZER PIPE for SVG ---
@Pipe({ name: 'safeHtml', standalone: true })
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(value: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(value); }
}

// --- INTERFACES ---
interface User {
  userid: string;
  username: string | "unknown";
  email: string | "unknown";
  role: string;
  status: string;
  bio: string;
  degreeid: number;
  yearofstudy: number;
  profile_picture: string | null;
}
interface SupabaseUser { id: string; email: string; name: string; user_metadata: { [key: string]: any }; }
interface UserCourse { userid: string; courseCode: string; }
interface Module { courseCode: string; courseName: string; facultyid: number; }
interface Degree { degreeid: number; degree_name: string; degree_type: string; facultyid: string; }
interface Stat { svgIcon: string; value: string; label: string; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeHtmlPipe],
  templateUrl: './findpartners.html',
  styleUrls: ['./findpartners.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FindPartners implements OnInit {
  // --- SERVICE INJECTIONS ---
  private apiService = inject(ApiService);
  private userApiService = inject(UserApiService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private chatService = inject(ChatService);
  private router = inject(Router);

  // --- COMPONENT STATE ---
  isButtonDisabled = false; // Initial state for the message button
  isLoading$ = new BehaviorSubject<boolean>(true);
  isNavigating$ = new BehaviorSubject<boolean>(false);
  isProfileLoading$ = new BehaviorSubject<boolean>(false);

  // --- USER & PARTNER DATA ---
  private allPartners: User[] = [];
  private currentUser = new BehaviorSubject<User | null>(null);
  private currentUserCourseCodes = new Set<string>();

  // --- FILTERING, SORTING & PAGINATION ---
  searchTerm$ = new BehaviorSubject<string>('');
  selectedDegree$ = new BehaviorSubject<string>('All');
  filteredAndSortedPartners: User[] = [];
  paginatedPartners = new BehaviorSubject<User[]>([]);
  currentPage$ = new BehaviorSubject<number>(1);
  itemsPerPage = 9;
  totalPages = 0;

  // --- MODAL STATE ---
  selectedPartner = new BehaviorSubject<User | null>(null);
  partnerStats = new BehaviorSubject<Stat[]>([]);

  // --- UI DATA ---
  userCourses: UserCourse[] = [];
  modules: Module[] = [];
  degrees: Degree[] = [];
  availableDegreesForFilter: Degree[] = [];

  ngOnInit() {
    this.initializeComponent();
    this.setupFilterListeners();
  }

  async initializeComponent(): Promise<void> {
    this.isLoading$.next(true);
    try {
      const authResult = await this.authService.getCurrentUser();
      const userId = authResult.data.user?.id;
      if (!userId) throw new Error("Could not determine current user.");

      this.fetchCoreData(userId);
    } catch (err) {
      console.error("Error initializing component:", err);
      this.isLoading$.next(false);
    }
  }

  fetchCoreData(currentUserId: string): void {
    forkJoin({
      degrees: this.apiService.getDegree().pipe(catchError(() => of([]))),
      modules: this.apiService.getModule().pipe(catchError(() => of([]))),
      allUserCourses: this.apiService.getAllUserCourses().pipe(catchError(() => of([]))),
      allPgUsers: this.apiService.getUser().pipe(catchError(() => of([]))),
      allSupabaseUsers: this.userService.getAllUsers(),
    }).subscribe({
      next: (results) => {
        this.degrees = results.degrees;
        this.modules = results.modules;
        this.userCourses = results.allUserCourses;

        // Process current user data first for sorting logic
        const currentUserPg = results.allPgUsers.find((p: User) => p.userid === currentUserId);
        if (currentUserPg) this.currentUser.next(currentUserPg);
        this.currentUserCourseCodes = new Set(this.userCourses.filter(c => c.userid === currentUserId).map(c => c.courseCode));

        // Merge and process partner data
        const supabaseUserMap = new Map(results.allSupabaseUsers.map((u: SupabaseUser) => [u.id, { username: u.name, email: u.email }]));
        const usersWithCourses = new Set(this.userCourses.map(uc => uc.userid));

        this.allPartners = results.allPgUsers
          .filter((p: User) =>
            p.userid !== currentUserId &&
            p.status === 'active' &&
            p.yearofstudy > 0 &&
            supabaseUserMap.has(p.userid) &&
            usersWithCourses.has(p.userid)
          )
          .map((p: User) => ({ ...p, ...supabaseUserMap.get(p.userid)! }));

        const availableDegreeIds = new Set(this.allPartners.map(p => p.degreeid));
        this.availableDegreesForFilter = this.degrees.filter(d => availableDegreeIds.has(d.degreeid));

        this.applyFiltersAndSort();
        this.isLoading$.next(false);
      },
      error: (err) => {
        console.error("Failed to fetch core data", err);
        this.isLoading$.next(false);
      }
    });
  }

  setupFilterListeners(): void {
    this.searchTerm$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.applyFiltersAndSort());
    this.selectedDegree$.subscribe(() => this.applyFiltersAndSort());
    this.currentPage$.subscribe(() => this.updatePaginatedView());
  }

  applyFiltersAndSort(): void {
    const searchTerm = this.searchTerm$.getValue().toLowerCase().trim();
    const degreeFilter = this.selectedDegree$.getValue();
    const currentUser = this.currentUser.getValue();
    if (!currentUser) return;

    // 1. Apply Search and Degree Filters
    let filtered = this.allPartners.filter(partner => {
      const matchesDegree = degreeFilter === 'All' || partner.degreeid === Number(degreeFilter);
      if (!matchesDegree) return false;

      if (searchTerm) {
        return partner.username.toLowerCase().includes(searchTerm) ||
          this.getDegreeName(partner.degreeid).toLowerCase().includes(searchTerm) ||
          this.getPartnerCourses(partner.userid).some(c => c.courseName.toLowerCase().includes(searchTerm));
      }
      return true;
    });

    // 2. Sort by Relevance
    this.filteredAndSortedPartners = filtered.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, currentUser);
      const bScore = this.calculateRelevanceScore(b, currentUser);
      return bScore - aScore; // Higher score comes first
    });

    // 3. Reset pagination and update view
    if (this.currentPage$.getValue() !== 1) {
      this.currentPage$.next(1);
    } else {
      this.updatePaginatedView();
    }
  }

  calculateRelevanceScore(partner: User, currentUser: User): number {
    let score = 0;
    // Highest priority: same degree
    if (partner.degreeid === currentUser.degreeid) {
      score += 10;
    }
    // Second priority: shared modules
    const partnerCourses = new Set(this.userCourses.filter(uc => uc.userid === partner.userid).map(uc => uc.courseCode));
    const sharedCoursesCount = [...this.currentUserCourseCodes].filter(code => partnerCourses.has(code)).length;
    score += sharedCoursesCount * 2; // 2 points per shared module

    return score;
  }

  updatePaginatedView(): void {
    this.totalPages = Math.ceil(this.filteredAndSortedPartners.length / this.itemsPerPage);
    const startIndex = (this.currentPage$.getValue() - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedPartners.next(this.filteredAndSortedPartners.slice(startIndex, endIndex));
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage$.next(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage(): void {
    this.setPage(this.currentPage$.getValue() - 1);
  }

  nextPage(): void {
    this.setPage(this.currentPage$.getValue() + 1);
  }

  // --- MODAL METHODS ---
  viewProfile(partner: User): void {
    this.selectedPartner.next(partner);
    this.isProfileLoading$.next(true);
    this.partnerStats.next([]);
    this.userApiService.getUserStats(partner.userid).pipe(catchError(() => of(null)))
      .subscribe(stats => {
        if (stats) {
          this.partnerStats.next([
            { svgIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>', value: `${stats.studyHours}h`, label: 'Study Hours' },
            { svgIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="m16 3.13 1.41 1.41a4 4 0 0 1 0 5.66L16 11.66"/></svg>', value: String(stats.studyPartners), label: 'Partners' },
          ]);
        }
        this.isProfileLoading$.next(false);
      });
  }
  closeProfile = () => this.selectedPartner.next(null);

  // --- HELPER METHODS ---
  getDegreeName = (degreeId: number): string => this.degrees.find(d => d.degreeid === degreeId)?.degree_name || '...';
  getPartnerCourses = (partnerId: string): Module[] => {
    const codes = new Set(this.userCourses.filter(uc => uc.userid === partnerId).map(uc => uc.courseCode));
    return this.modules.filter(m => codes.has(m.courseCode));
  };
  getInitials = (username: string): string => {
    if (!username?.trim()) { return '?'; }
    const parts = username.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };
  getAvatarColor = (username: string): string => {
    const colors = ['#6a5af9', '#6f42c1', '#28a745', '#dc3545', '#ffc107', '#17a2b8'];
    const sum = (username || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    return colors[sum % colors.length];
  };
  getYearOfStudy = (year: number): string => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    return year + (suffixes[(year - 20) % 10] || suffixes[year] || suffixes[0]) + ' Year';
  };

  async messageOnClick(partner: User): Promise<void> {
    const currentUser = this.currentUser.getValue();
    if (!currentUser) {
      console.error("Cannot create chat: current user is not available.");
      return;
    }

    this.isButtonDisabled = true;
    this.isNavigating$.next(true);

    try {
      const result = await firstValueFrom(this.chatService.createChat({
        user1: { userid: currentUser.userid },
        user2: { userid: partner.userid }
      }));

      if (result) {
        this.router.navigate(['/chat']);
        this.chatService.setPartnerID(partner.userid);
      } else {
        throw new Error("Chat creation did not return a successful result.");
      }
    } catch (error) {
      console.error("Error creating or navigating to chat:", error);
    } finally {
      this.isNavigating$.next(false);
      this.isButtonDisabled = false;
    }
  }
}
