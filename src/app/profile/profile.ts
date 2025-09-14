import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// --- INTERFACES ---

// Interface for a single course module
interface Module {
  courseCode: string;
  courseName: string;
  facultyid: string;
}

interface Degree {
  degreeid: number;
  degree_name: string;
  degree_type: string;
  facultyid: number;
}

// Interface for a single statistic card
interface Stat {
  svgIcon: string;
  value: string;
  label: string;
}

interface UserCourse {
  userid: string;
  courseCode: string;
}

// Interface for the User data model - removed courseCodes
interface User {
  userId: string;
  degreeId: number; // Changed to number to match Degree interface
  yearOfStudy: number;
  role: 'Student' | 'Tutor' | 'Admin';
  status: 'Active' | 'Inactive';
  bio: string;
  // Other non-editable fields for profile display
  initials: string;
  name: string;
  university: string;
  location: string;
  // Stats are kept within the user data as requested
  stats: Stat[];
  // courseCodes removed - will use UserCourse array instead
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class Profile {
  // --- STATE MANAGEMENT WITH SIGNALS ---

  // Dummy data for all available modules a user can pick from
  allAvailableModules = signal<Module[]>([
    { courseCode: 'CS101', courseName: 'Intro to Programming', facultyid: 'F01' },
    { courseCode: 'CS102', courseName: 'Data Structures', facultyid: 'F01' },
    { courseCode: 'CS201', courseName: 'Algorithms', facultyid: 'F01' },
    { courseCode: 'CS205', courseName: 'Web Development', facultyid: 'F01' },
    { courseCode: 'CS301', courseName: 'Machine Learning', facultyid: 'F01' },
    { courseCode: 'DB210', courseName: 'Database Systems', facultyid: 'F02' },
    { courseCode: 'MA101', courseName: 'Calculus I', facultyid: 'F03' },
    { courseCode: 'PH101', courseName: 'Physics for Engineers', facultyid: 'F04' },
    { courseCode: 'BUS101', courseName: 'Business Fundamentals', facultyid: 'F05' },
    { courseCode: 'ENG101', courseName: 'Engineering Principles', facultyid: 'F06' },
  ]);

  // Available degrees for user to choose from
  availableDegrees = signal<Degree[]>([
    { degreeid: 1, degree_name: 'Computer Science', degree_type: 'Bachelor', facultyid: 1 },
    { degreeid: 2, degree_name: 'Information Technology', degree_type: 'Bachelor', facultyid: 1 },
    { degreeid: 3, degree_name: 'Software Engineering', degree_type: 'Bachelor', facultyid: 1 },
    { degreeid: 4, degree_name: 'Data Science', degree_type: 'Bachelor', facultyid: 1 },
    { degreeid: 5, degree_name: 'Business Administration', degree_type: 'Bachelor', facultyid: 2 },
    { degreeid: 6, degree_name: 'Mathematics', degree_type: 'Bachelor', facultyid: 3 },
    { degreeid: 7, degree_name: 'Physics', degree_type: 'Bachelor', facultyid: 4 },
    { degreeid: 8, degree_name: 'Engineering', degree_type: 'Bachelor', facultyid: 6 },
  ]);

  // Main signal holding the user's profile data - removed courseCodes
  user = signal<User>({
    userId: 'usr_f8e29a',
    initials: 'JS',
    name: 'Jordan Smith',
    degreeId: 1, // References degree from availableDegrees
    yearOfStudy: 3,
    role: 'Student',
    status: 'Active',
    university: 'State University',
    location: 'On Campus',
    bio: 'Passionate computer science student with interests in AI, web development, and collaborative learning. Always eager to help others and learn new concepts!',
    stats: [
      { svgIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', value: '156h', label: 'Study Hours' },
      { svgIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', value: '12', label: 'Study Partners' },
      { svgIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>', value: '42', label: 'Topics Completed' },
      { svgIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>', value: '4.7', label: 'Average Rating' },
    ]
  });

  // UserCourse data - represents the courses this user is enrolled in
  userCourses = signal<UserCourse[]>([
    { userid: "usr_f8e29a", courseCode: "CS102" },
    { userid: "usr_f8e29a", courseCode: "CS201" },
    { userid: "usr_f8e29a", courseCode: "CS301" },
  ]);

  // --- DERIVED/VIEW STATE ---

  // Computed signal to get the current user's degree name
  userDegreeName = computed(() => {
    const user = this.user();
    const degree = this.availableDegrees().find(d => d.degreeid === user.degreeId);
    return degree ? degree.degree_name : 'Unknown Degree';
  });

  // Computed signal to get the full Module objects for the current user
  userModules = computed(() => {
    const currentUserId = this.user().userId;
    const userCourseCodes = this.userCourses()
      .filter(uc => uc.userid === currentUserId)
      .map(uc => uc.courseCode);

    return this.allAvailableModules().filter(module =>
      userCourseCodes.includes(module.courseCode)
    );
  });

  // Computed signal to filter all available modules based on the search term in edit mode
  filteredModules = computed(() => {
    const searchTerm = this.moduleSearchTerm().toLowerCase().trim();
    if (!searchTerm) {
      return this.allAvailableModules();
    }
    return this.allAvailableModules().filter(module =>
      module.courseName.toLowerCase().includes(searchTerm) ||
      module.courseCode.toLowerCase().includes(searchTerm)
    );
  });

  // --- EDITING STATE ---

  isEditing = signal(false);
  // Signals for each editable field
  editedDegreeId = signal(0);
  editedYearOfStudy = signal(0);
  editedBio = signal('');
  editedSelectedModuleCodes = signal<string[]>([]);
  moduleSearchTerm = signal('');

  // --- METHODS ---

  startEditing(): void {
    const currentUser = this.user();
    const currentUserId = currentUser.userId;

    this.editedDegreeId.set(currentUser.degreeId);
    this.editedYearOfStudy.set(currentUser.yearOfStudy);
    this.editedBio.set(currentUser.bio);

    // Initialize the selection with the user's current course codes from UserCourse
    const currentCourseCodes = this.userCourses()
      .filter(uc => uc.userid === currentUserId)
      .map(uc => uc.courseCode);
    this.editedSelectedModuleCodes.set(currentCourseCodes);

    this.moduleSearchTerm.set(''); // Reset search on edit start
    this.isEditing.set(true);
  }

  saveChanges(): void {
    const currentUserId = this.user().userId;

    // Update user data
    this.user.update(currentUser => ({
      ...currentUser,
      degreeId: this.editedDegreeId(),
      yearOfStudy: this.editedYearOfStudy(),
      bio: this.editedBio(),
    }));

    // Update user courses
    const newCourseCodes = this.editedSelectedModuleCodes();
    const newUserCourses = newCourseCodes.map(courseCode => ({
      userid: currentUserId,
      courseCode: courseCode
    }));

    // Replace user courses for this user
    this.userCourses.update(allUserCourses => {
      // Remove existing courses for this user
      const otherUsersCourses = allUserCourses.filter(uc => uc.userid !== currentUserId);
      // Add new courses for this user
      return [...otherUsersCourses, ...newUserCourses];
    });

    this.isEditing.set(false);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  // Helper to check if a module is selected in edit mode
  isModuleSelected(courseCode: string): boolean {
    return this.editedSelectedModuleCodes().includes(courseCode);
  }

  // Handles the change event from the module checkboxes
  onModuleSelectionChange(event: Event, courseCode: string): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.editedSelectedModuleCodes.update(codes => {
      if (isChecked) {
        return [...codes, courseCode];
      } else {
        return codes.filter(c => c !== courseCode);
      }
    });
  }

  // Helper to get degree name by ID
  getDegreeName(degreeId: number): string {
    const degree = this.availableDegrees().find(d => d.degreeid === degreeId);
    return degree ? degree.degree_name : 'Unknown Degree';
  }

  // Getter for easy access to current user's degree name (for template compatibility)
  // get currentUserDegreeName(): string {
  //   return this.userDegreeName();
  // }
}
