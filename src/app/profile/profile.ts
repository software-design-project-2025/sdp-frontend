import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject, Pipe, PipeTransform } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UserApiService } from '../services/user.service';
import { AcademicApiService } from '../services/academic.service';
import { AuthService } from '../services';
import { UserService } from '../services/supabase.service';

// --- SANITIZER PIPE for SVG ---
@Pipe({ name: 'safeHtml', standalone: true })
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}

// --- INTERFACES ---
interface Module { courseCode: string; courseName: string; facultyid: string; }
interface Degree { degreeid: number; degree_name: string; degree_type: string; facultyid: number; }
interface Stat { svgIcon: string; value: string; label: string; }
interface UserCourse { userid: string; courseCode: string; }
interface User {
  userId: string;
  degreeid: number;
  yearofstudy: number;
  role: 'Student' | 'Tutor' | 'Admin';
  status: 'Active' | 'Inactive';
  bio: string;
  initials: string;
  name: string;
  university: string;
  stats: Stat[];
}
// ✅ ADDED: Interface for the new stats API response
interface UserStats {
  topicsCompleted: number;
  studyHours: number;
  studyPartners: number;
  totalSessions: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, CommonModule, SafeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class Profile implements OnInit {
  // Injected all necessary services
  private userApiService = inject(UserApiService);
  private academicApiService = inject(AcademicApiService);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  // --- STATE SIGNALS ---
  isLoading = signal<boolean>(true);
  user = signal<User | null>(null);
  isEditing = signal(false);

  // --- DATA SIGNALS ---
  availableDegrees = signal<Degree[]>([]);
  allAvailableModules = signal<Module[]>([]);
  userCourses = signal<UserCourse[]>([]);

  // --- EDITING STATE SIGNALS ---
  editedDegreeId = signal(0);
  editedYearOfStudy = signal(0);
  editedBio = signal('');
  editedSelectedModuleCodes = signal<string[]>([]);
  moduleSearchTerm = signal('');

  ngOnInit(): void {
    this.initializeProfile();
  }

  async initializeProfile(): Promise<void> {
    this.isLoading.set(true);
    try {
      const authResult = await this.authService.getCurrentUser();
      const userId = authResult.data.user?.id;
      if (!userId) throw new Error("Could not determine current user.");

      const userProfile = await this.userService.getUserById(userId);
      const name = userProfile.name || 'User';

      this.fetchFullProfileData(userId, name);
    } catch (err) {
      console.error("Error initializing profile:", err);
      this.isLoading.set(false);
    }
  }

  fetchFullProfileData(userId: string, name: string): void {
    forkJoin({
      userResponse: this.userApiService.getUserById(userId).pipe(catchError(() => of(null))),
      coursesResponse: this.userApiService.getUserCourses(userId).pipe(catchError(() => of({ courses: [] }))),
      degreesResponse: this.academicApiService.getAllDegrees().pipe(catchError(() => of([]))),
      modulesResponse: this.academicApiService.getAllModules().pipe(catchError(() => of([]))),
      // ✅ ADDED: Fetching the user stats from the new endpoint
      userStats: this.userApiService.getUserStats(userId).pipe(catchError(() => of(null)))
    }).subscribe(({ userResponse, coursesResponse, degreesResponse, modulesResponse, userStats }) => {
      this.availableDegrees.set(degreesResponse);
      this.allAvailableModules.set(modulesResponse);

      const courseCodes = coursesResponse.courses || [];
      this.userCourses.set(
        courseCodes.map((code: string) => ({ userid: userId, courseCode: code }))
      );

      // ✅ Dynamically build the stats array from the API response
      let liveStats: Stat[] = [];
      if (userStats) {
        liveStats = [
          { svgIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', value: `${userStats.studyHours}h`, label: 'Study Hours' },
          { svgIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', value: String(userStats.studyPartners), label: 'Study Partners' },
          { svgIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>', value: String(userStats.topicsCompleted), label: 'Topics Completed' },
          // ✅ REPLACED: "Average Rating" is now "Total Sessions"
          { svgIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', value: String(userStats.totalSessions), label: 'Total Sessions' }
        ];
      }

      const apiUserData = Array.isArray(userResponse) ? userResponse[0] : userResponse;
      if (apiUserData) {
        this.user.set({
          userId, name,
          initials: this.getInitials(name),
          university: "Wits University",
          // ✅ Using the live stats instead of dummy data
          stats: liveStats,
          ...apiUserData
        });
      }

      this.isLoading.set(false);
    }, error => {
      console.error("Failed to fetch profile data", error);
      this.isLoading.set(false);
    });
  }

  // --- COMPUTED SIGNALS ---
  userDegreeName = computed(() => {
    const u = this.user();
    if (!u) return '...';
    const degree = this.availableDegrees().find(d => d.degreeid === u.degreeid);
    return degree ? degree.degree_name : 'Unknown Degree';
  });

  userModules = computed(() => {
    const u = this.user();
    if (!u) return [];
    const userCourseCodes = this.userCourses().filter(uc => uc.userid === u.userId).map(uc => uc.courseCode);
    return this.allAvailableModules().filter(module => userCourseCodes.includes(module.courseCode));
  });

  filteredModules = computed(() => {
    const searchTerm = this.moduleSearchTerm().toLowerCase().trim();
    if (!searchTerm) return this.allAvailableModules();
    return this.allAvailableModules().filter(module =>
      module.courseName.toLowerCase().includes(searchTerm) ||
      module.courseCode.toLowerCase().includes(searchTerm)
    );
  });

  // --- EDITING METHODS ---
  startEditing(): void {
    const currentUser = this.user();
    if (!currentUser) return;
    this.editedDegreeId.set(currentUser.degreeid);
    this.editedYearOfStudy.set(currentUser.yearofstudy);
    this.editedBio.set(currentUser.bio);
    const currentCourseCodes = this.userCourses().map(uc => uc.courseCode);
    this.editedSelectedModuleCodes.set(currentCourseCodes);
    this.moduleSearchTerm.set('');
    this.isEditing.set(true);
  }

  saveChanges(): void {
    const currentUser = this.user();
    if (!currentUser) return;
    this.user.update(u => u ? {
      ...u,
      degreeid: this.editedDegreeId(),
      yearofstudy: this.editedYearOfStudy(),
      bio: this.editedBio(),
    } : null);
    const newUserCourses = this.editedSelectedModuleCodes().map(courseCode => ({
      userid: currentUser.userId, courseCode
    }));
    this.userCourses.set(newUserCourses);
    console.log("Saving data...", { user: this.user(), courses: this.userCourses() });
    this.isEditing.set(false);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  // --- EDITING HELPERS ---
  isModuleSelected = (courseCode: string) => this.editedSelectedModuleCodes().includes(courseCode);

  onModuleSelectionChange(event: Event, courseCode: string): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.editedSelectedModuleCodes.update(codes =>
      isChecked ? [...codes, courseCode] : codes.filter(c => c !== courseCode)
    );
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const names = name.split(' ');
    return (names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : name[0]).toUpperCase();
  }
}

