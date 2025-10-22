import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Subscription, interval, forkJoin, of, firstValueFrom } from 'rxjs'; // Removed timer, switchMap
import { map, takeWhile, catchError, filter } from 'rxjs/operators';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// **** ADDED Material Form Field related modules ****
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';


// Models & Interfaces
import { Session } from '../models/session.model';
import { User } from '../sessions/sessions.component'; // Ensure path is correct
import { SessionParticipant } from '../services/sessions.service';

// Services
import { SessionsService } from '../services/sessions.service';
import { AuthService } from '../services/auth.service';
import { ChatService, ChatMessage } from '../services/chat.service';
import { DocApiService, NewChatDoc, Document as ChatDocument } from '../services/doc.service';

// **** UPDATED: Corrected import name ****
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog'; // Use the actual component class name


interface RoomMessage {
  id: number; senderId: string; senderName: string; content: string;
  timestamp: Date; isCurrentUser: boolean;
  document?: { id: number; originalFilename: string; downloading?: boolean };
}

@Component({
  selector: 'app-session-room',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatSnackBarModule, MatDialogModule, MatProgressSpinnerModule,
    // **** ADDED Material Form Modules ****
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule
  ],
  providers: [DatePipe],
  templateUrl: './session-room.html', // Corrected extension
  styleUrls: ['./session-room.scss']  // Corrected extension
})
export class SessionRoom implements OnInit, OnDestroy, AfterViewChecked { // Corrected component name casing
  // ... (Rest of the component code remains the same as your last correct version) ...
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;
  private shouldScrollToBottom = false;

  // --- State ---
  isLoading$ = new BehaviorSubject<boolean>(true);
  sessionLoadingError$ = new BehaviorSubject<string | null>(null);
  chatLoadingError$ = new BehaviorSubject<string | null>(null);
  isSending$ = new BehaviorSubject<boolean>(false);

  sessionId: number | null = null;
  session = new BehaviorSubject<Session | null>(null);
  participants = new BehaviorSubject<SessionParticipant[]>([]);
  messages = new BehaviorSubject<RoomMessage[]>([]);

  // --- Timer ---
  elapsedTime$ = new BehaviorSubject<string>('00:00:00');
  remainingTime$ = new BehaviorSubject<string | null>(null); // Can be string or null (if ongoing)
  sessionEnded$ = new BehaviorSubject<boolean>(false);
  private timerSubscription: Subscription | null = null;

  // --- Forms ---
  messageForm: FormGroup;

  // --- User Info ---
  currentUserId: string = '';
  private userNameMap = new Map<string, string>(); // To display names in chat

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionsService: SessionsService,
    private chatService: ChatService, // Assumes sessionId = chatId
    private docApiService: DocApiService, // If using docs
    private authService: AuthService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private datePipe: DatePipe,
    private cdr: ChangeDetectorRef
  ) {
    this.messageForm = this.fb.group({
      message: ['', Validators.required]
    });
  }

  async ngOnInit(): Promise<void> {
    this.isLoading$.next(true);
    try {
      const userRes = await this.authService.getCurrentUser();
      this.currentUserId = userRes.data.user?.id ?? '';
      if (!this.currentUserId) throw new Error('Cannot get current user.');

      this.sessionId = Number(this.route.snapshot.paramMap.get('id'));
      if (isNaN(this.sessionId) || this.sessionId <= 0) throw new Error('Invalid session ID.');

      await this.loadSessionAndChatData(this.sessionId);

      this.isLoading$.next(false);
      this.shouldScrollToBottom = true;

    } catch (error: any) {
      console.error("Error initializing session room:", error);
      this.sessionLoadingError$.next(error.message || 'Failed to load session details.');
      this.isLoading$.next(false);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();
  }

  private async loadSessionAndChatData(sessionId: number): Promise<void> {
    try {
      // Fetch raw session data which might have date strings
      const rawSessionDetails = await firstValueFrom(
        this.sessionsService.getSessionById(sessionId).pipe(catchError(err => {
          throw new Error(`Session not found or error loading details: ${err.message}`);
        }))
      );
      if (!rawSessionDetails) throw new Error('Session data not found.');

      // --- NEW: Convert dates before proceeding ---
      let convertedStartTime: Date | null = null;
      let convertedEndTime: Date | 'infinity' | null = null;

      // Try parsing start_time (or startTime if that's the backend name)
      const startTimeValue = (rawSessionDetails as any).start_time || (rawSessionDetails as any).startTime; // Check both names
      if (startTimeValue) {
        try {
          const parsedDate = new Date(startTimeValue);
          if (!isNaN(parsedDate.getTime())) {
            convertedStartTime = parsedDate;
          } else {
            console.warn("Invalid start_time format received:", startTimeValue);
          }
        } catch (e) {
          console.error("Error parsing start_time:", startTimeValue, e);
        }
      }

      // If start time is invalid after trying, throw error
      if (!convertedStartTime) {
        throw new Error('Could not parse session start time.');
      }

      // Try parsing end_time (or endTime)
      const endTimeValue = (rawSessionDetails as any).end_time || (rawSessionDetails as any).endTime;
      if (endTimeValue === 'infinity') {
        convertedEndTime = 'infinity';
      } else if (endTimeValue) {
        try {
          const parsedDate = new Date(endTimeValue);
          if (!isNaN(parsedDate.getTime())) {
            convertedEndTime = parsedDate;
          } else {
            console.warn("Invalid end_time format received:", endTimeValue);
          }
        } catch (e) {
          console.warn("Error parsing end_time:", endTimeValue, e);
        }
      }
      // --- END DATE CONVERSION ---


      // Create the final Session object with Date objects
      const sessionDetails: Session = {
        ...rawSessionDetails, // Spread original data
        start_time: convertedStartTime, // Overwrite with Date object
        end_time: convertedEndTime // Overwrite with Date object or 'infinity' or null
      };

      // Simple check: Is the session already completed?
      if (sessionDetails.status === 'completed') {
        throw new Error('This session has already ended.');
      }

      this.session.next(sessionDetails); // Use the processed session details

      // Fetch participants and messages (this part remains the same)
      const [participants, initialMessages] = await Promise.all([
        firstValueFrom(this.sessionsService.getSessionMembers(sessionId).pipe(catchError(() => of([])))),
        this.fetchAndFormatMessages(sessionId)
      ]);
      this.participants.next(participants);
      this.userNameMap.clear();
      (participants || []).forEach(p => this.userNameMap.set(p.userid, p.username));
      if(this.currentUserId && !this.userNameMap.has(this.currentUserId)) {
        const currentUserInfo = await this.authService.getCurrentUser();
        this.userNameMap.set(this.currentUserId, currentUserInfo.data.user?.user_metadata?.['name'] || 'You');
      }
      this.messages.next(initialMessages);

      this.startTimer(sessionDetails); // Start timer with the processed session details

    } catch (error: any) {
      console.error("Error in loadSessionAndChatData:", error);
      throw error; // Re-throw to be caught by ngOnInit
    }
  }

  private async fetchAndFormatMessages(sessionId: number): Promise<RoomMessage[]> {
    this.chatLoadingError$.next(null);
    try {
      const apiMessages = await firstValueFrom(
        this.chatService.getMessagesByChatId(sessionId).pipe(catchError(() => of([])))
      );
      const docMessages = await firstValueFrom(
        this.docApiService.getDocsByChatId(sessionId).pipe(catchError(() => of([])))
      );
      const allRawMessages: any[] = [...(apiMessages || []), ...(docMessages || [])];
      allRawMessages.sort((a, b) =>
        new Date(a.sent_datetime || a.sentDateTime).getTime() - new Date(b.sent_datetime || b.sentDateTime).getTime()
      );
      return allRawMessages.map(msg => this.formatMessage(msg));
    } catch (error: any) {
      console.error("Error fetching chat messages:", error);
      this.chatLoadingError$.next('Could not load chat messages.');
      return [];
    }
  }

  private formatMessage(msg: any): RoomMessage {
    const isDoc = msg.cdID != null;
    const senderId = msg.senderid || msg.senderID;
    const timestamp = new Date(msg.sent_datetime || msg.sentDateTime);
    let documentInfo: RoomMessage['document'] | undefined = undefined;
    if (isDoc && msg.doc) {
      const [docIdStr, ...filenameParts] = String(msg.doc).split(':');
      const docId = parseInt(docIdStr, 10);
      const originalFilename = filenameParts.join(':');
      if (!isNaN(docId) && originalFilename) {
        documentInfo = { id: docId, originalFilename };
      }
    }
    return {
      id: msg.messageid ?? msg.cdID, senderId: senderId,
      senderName: this.userNameMap.get(senderId) || 'Unknown',
      content: isDoc ? '' : msg.message, timestamp: timestamp,
      isCurrentUser: senderId === this.currentUserId, document: documentInfo
    };
  }

  private startTimer(sessionData: Session): void {
    this.timerSubscription?.unsubscribe();

    // --- ADD VALIDATION ---
    let startTime: Date;
    try {
      // Ensure start_time is a Date object
      if (!(sessionData.start_time instanceof Date)) {
        startTime = new Date(sessionData.start_time); // Attempt conversion
      } else {
        startTime = sessionData.start_time;
      }
      // Crucial Check: Is the resulting date valid?
      if (isNaN(startTime.getTime())) {
        throw new Error(`Invalid start_time format: ${sessionData.start_time}`);
      }
    } catch (e) {
      console.error("Error initializing timer with start_time:", e);
      this.elapsedTime$.next('--:--:--'); // Display placeholder on error
      this.remainingTime$.next('--:--:--');
      this.sessionLoadingError$.next('Could not parse session start time.'); // Show error
      return; // Stop timer setup
    }

    let endTime: Date | null = null;
    if (sessionData.end_time && sessionData.end_time !== 'infinity') {
      try {
        // Ensure end_time is a Date object
        if (!(sessionData.end_time instanceof Date)) {
          endTime = new Date(sessionData.end_time); // Attempt conversion
        } else {
          endTime = sessionData.end_time;
        }
        // If conversion results in invalid date, treat as null (ongoing)
        if (isNaN(endTime.getTime())) {
          console.warn("Invalid end_time format, treating as ongoing:", sessionData.end_time);
          endTime = null;
        }
      } catch (e) {
        console.warn("Error parsing end_time, treating as ongoing:", sessionData.end_time, e);
        endTime = null; // Treat as ongoing on error
      }
    }
    // --- END VALIDATION ---


    this.timerSubscription = interval(1000)
      .pipe(
        map(() => {
          const now = new Date();
          // Calculations now use validated 'startTime' and 'endTime'
          let elapsedSeconds = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
          let remainingSeconds: number | null = null;

          if (endTime) { // 'endTime' is now guaranteed to be a valid Date or null
            remainingSeconds = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
            if (remainingSeconds === 0 && !this.sessionEnded$.value) {
              this.sessionEnded$.next(true);
              this.showSnackbar('Session time has ended.');
            }
          }
          // Safety check for NaN before formatting
          if (isNaN(elapsedSeconds) || (remainingSeconds !== null && isNaN(remainingSeconds))) {
            console.error("NaN detected during timer update. Start:", startTime, "End:", endTime);
            return { elapsedSeconds: NaN, remainingSeconds: NaN }; // Propagate NaN to handle below
          }
          return { elapsedSeconds, remainingSeconds };
        }),
        takeWhile(({ remainingSeconds }) => !(remainingSeconds === 0 && endTime), true)
      )
      .subscribe(({ elapsedSeconds, remainingSeconds }) => {
          // Final check before displaying
          if (isNaN(elapsedSeconds)) {
            this.elapsedTime$.next('--:--:--');
          } else {
            this.elapsedTime$.next(this.formatSeconds(elapsedSeconds));
          }
          if (remainingSeconds === null) {
            this.remainingTime$.next('Ongoing');
          } else if (isNaN(remainingSeconds)) {
            this.remainingTime$.next('--:--:--');
          } else {
            this.remainingTime$.next(this.formatSeconds(remainingSeconds));
          }
        },
        (err) => console.error("Timer subscription error:", err),
        () => {
          if(endTime && !this.sessionEnded$.value) {
            this.sessionEnded$.next(true);
            this.showSnackbar('Session time has ended.');
          }
          console.log('Timer stopped.');
        });
  }

  private formatSeconds(totalSeconds: number): string {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "--:--:--"; // Handle invalid input
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  private pad(num: number): string {
    return num.toString().padStart(2, '0');
  }

  async sendMessage(): Promise<void> {
    if (!this.messageForm.valid || !this.sessionId || this.isSending$.value) return;
    const messageContent = this.messageForm.get('message')?.value.trim();
    if (!messageContent) return;
    this.isSending$.next(true); this.messageForm.reset();
    const tempId = Date.now();
    const newMessage: RoomMessage = {
      id: tempId, senderId: this.currentUserId,
      senderName: this.userNameMap.get(this.currentUserId) || 'You',
      content: messageContent, timestamp: new Date(), isCurrentUser: true
    };
    this.messages.next([...this.messages.value, newMessage]);
    this.shouldScrollToBottom = true; this.cdr.detectChanges();
    try {
      const payload: ChatMessage = {
        messageid: 0, chatid: this.sessionId, senderid: this.currentUserId,
        message: messageContent, sent_datetime: new Date(), read_status: false
      };
      const savedMessage = await firstValueFrom(this.chatService.createMessage(payload));
      const currentMessages = this.messages.value;
      const msgIndex = currentMessages.findIndex(m => m.id === tempId);
      if (msgIndex > -1 && savedMessage) {
        currentMessages[msgIndex].id = savedMessage.messageid;
        this.messages.next([...currentMessages]);
      }
    } catch (error) {
      console.error("Error sending message:", error); this.showSnackbar('Failed to send message.', true);
      this.messages.next(this.messages.value.filter(m => m.id !== tempId));
    } finally { this.isSending$.next(false); }
  }

  triggerFileUpload(): void { if(this.fileInput) this.fileInput.nativeElement.click(); }
  async onFileSelectedAndUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.sessionId || this.isSending$.value) return;
    const file = input.files[0];
    if(this.fileInput) this.fileInput.nativeElement.value = '';
    this.isSending$.next(true);
    const tempId = Date.now();
    const optimisticDocMessage: RoomMessage = {
      id: tempId, senderId: this.currentUserId, senderName: 'You', content: '',
      timestamp: new Date(), isCurrentUser: true,
      document: { id: -1, originalFilename: `Uploading: ${file.name}...`, downloading: true }
    };
    this.messages.next([...this.messages.value, optimisticDocMessage]);
    this.shouldScrollToBottom = true; this.cdr.detectChanges();
    try {
      const uploadedDoc: ChatDocument = await firstValueFrom(this.docApiService.uploadDocument(file, this.currentUserId).pipe(catchError(err => { throw new Error(`Upload failed: ${err.message}`); })));
      const newChatDocData: NewChatDoc = { senderID: this.currentUserId, chatID: this.sessionId, doc: `${uploadedDoc.id}:${uploadedDoc.originalFilename}` };
      await firstValueFrom(this.docApiService.createChatDoc(newChatDocData).pipe(catchError(err => { throw new Error(`Link failed: ${err.message}`); })));
      const currentMessages = this.messages.value;
      const msgIndex = currentMessages.findIndex(m => m.id === tempId);
      if (msgIndex > -1) {
        currentMessages[msgIndex].document = { id: uploadedDoc.id, originalFilename: uploadedDoc.originalFilename, downloading: false };
        this.messages.next([...currentMessages]); this.shouldScrollToBottom = true;
      }
      this.showSnackbar('Document sent.');
    } catch (err: any) {
      console.error("Doc send error:", err); this.showSnackbar(err.message || 'Failed to send doc.', true);
      this.messages.next(this.messages.value.filter(m => m.id !== tempId));
    } finally { this.isSending$.next(false); this.cdr.detectChanges(); }
  }
  async downloadDocument(doc: RoomMessage['document']): Promise<void> {
    if (!doc || doc.downloading) return;
    const currentMessages = this.messages.value;
    const msgIndex = currentMessages.findIndex(m => m.document?.id === doc.id);
    if (msgIndex > -1) { currentMessages[msgIndex].document!.downloading = true; this.messages.next([...currentMessages]); this.cdr.detectChanges(); }
    else { return; }
    try {
      const response = await firstValueFrom(this.docApiService.getDocumentDownloadUrl(doc.id).pipe(catchError(err => { throw new Error(`Link fetch failed: ${err.message}`); })));
      window.open(response.downloadUrl, '_blank');
    } catch (err: any) {
      console.error("Doc download error:", err); this.showSnackbar(err.message || 'Download failed.', true);
    } finally {
      const finalMessages = this.messages.value;
      const finalMsgIndex = finalMessages.findIndex(m => m.document?.id === doc.id);
      if (finalMsgIndex > -1) { finalMessages[finalMsgIndex].document!.downloading = false; this.messages.next([...finalMessages]); this.cdr.detectChanges(); }
    }
  }

  // --- Session Control ---
  confirmEndSession(): void {
    if (!this.sessionId || this.sessionEnded$.value) return;
    const currentSession = this.session.value;
    // Check added here
    if (currentSession?.status === 'scheduled') {
      this.showSnackbar("Cannot end a session that hasn't started.", true); return;
    }
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: { title: 'Confirm End Session', message: 'End this session now for everyone?' }, width: '350px'
    });
    dialogRef.afterClosed().pipe(filter(result => result === true))
      .subscribe(async () => {
        try {
          await firstValueFrom(this.sessionsService.endSession(this.sessionId!, this.currentUserId));
          this.showSnackbar('Session has been ended.'); this.sessionEnded$.next(true);
          this.timerSubscription?.unsubscribe(); this.remainingTime$.next('Ended');
        } catch (error: any) {
          console.error('End Error:', error);
          const errorMsg = error?.message?.includes("has not started yet") ? "Cannot end a session that hasn't started." : 'Error ending session.';
          this.showSnackbar(errorMsg, true);
        }
      });
  }

  // --- Helpers ---
  private scrollToBottom(): void { try { if (this.messagesContainer) this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight; } catch (err) { console.error('Scroll Error:', err); } }
  private showSnackbar(message: string, isError: boolean = false): void { this.snackBar.open(message, 'Dismiss', { duration: 3000, panelClass: isError ? ['snackbar-error'] : ['snackbar-success'], verticalPosition: 'top', horizontalPosition: 'center' }); }
  private resetStateOnError(): void { this.session.next(null); this.participants.next([]); this.messages.next([]); this.userNameMap.clear(); this.timerSubscription?.unsubscribe(); this.elapsedTime$.next('00:00:00'); this.remainingTime$.next(null); this.sessionEnded$.next(false); }
  trackByMessageId(index: number, message: RoomMessage): number { return message.id; }
  trackByIndex(index: number): number { return index; }
}
