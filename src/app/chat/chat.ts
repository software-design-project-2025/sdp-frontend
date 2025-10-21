import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChatMessage, ChatService } from '../services/chat.service';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, firstValueFrom, forkJoin } from 'rxjs';
import { UserApiService } from '../services/user.service';
import { DocApiService, NewChatDoc, Document as ChatDocument } from '../services/doc.service';

// --- INTERFACE DEFINITIONS ---
export interface User {
  userid: string;
  name: string;
  role: string;
  degreeid: number;
  yearofstudy: number;
  bio: string;
  status: string;
  profile_picture: string;
}

interface MessageDocument {
  id: number;
  originalFilename: string;
  downloading?: boolean;
}

interface Message {
  id: number;
  chatid: number;
  timestamp: Date;
  senderid: string;
  content: string;
  document: MessageDocument | null;
  type: 'sent' | 'received';
  read_status: boolean;
}

interface Conversation {
  id: number;
  participant: User;
  lastMessage: string;
  timestamp: Date | null;
  unreadCount: number;
  messages: Message[];
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class Chat implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;
  private shouldScrollToBottom = false;
  private imageErrors = new Set<string>();

  // State Management
  loading$ = new BehaviorSubject<boolean>(true);
  messagesLoading$ = new BehaviorSubject<boolean>(false);
  error: string = '';

  searchForm: FormGroup;
  messageForm: FormGroup;

  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  activeConversation: Conversation | null = null;

  currentUser: User = {
    userid: '', name: '', role: '', degreeid: 0, yearofstudy: 0,
    bio: '', status: '', profile_picture: "placeholder"
  };

  constructor(
    private fb: FormBuilder,
    private chatService: ChatService,
    private authService: AuthService,
    private UserService: UserApiService,
    private cdr: ChangeDetectorRef,
    private docApiService: DocApiService
  ) {
    this.searchForm = this.fb.group({ searchTerm: [''] });
    this.messageForm = this.fb.group({ message: ['', Validators.required] });
  }

  ngOnInit(): void {
    this.initializeChat();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottomSmooth();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.conversations.forEach(conversation => {
      const profilePic = conversation.participant.profile_picture;
      if (profilePic?.startsWith('blob:')) {
        URL.revokeObjectURL(profilePic);
      }
    });
  }

  private scrollToBottomSmooth(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
      }
    } catch (err) { console.error('Error scrolling to bottom:', err); }
  }

  async initializeChat(): Promise<void> {
    this.loading$.next(true);
    try {
      const userid = await this.getCurrentUserId();
      if (!userid) throw new Error("Could not authenticate user.");
      this.currentUser.userid = userid;

      const convos = await this.formatConvos(userid);
      const partnerID = this.chatService.getPartnerID();

      for (const convo of convos) {
        const name = await this.getOtherUserName(convo);
        convo.participant.name = name || 'Unknown User';

        if (partnerID && partnerID === convo.participant.userid) {
          this.setActiveConversation(convo);
        }

        const messages = await this.retrieveMessages(convo.id, userid);
        convo.messages = messages;
        convo.unreadCount = this.handleUnreadCount(messages);

        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          convo.timestamp = lastMsg.timestamp;
          convo.lastMessage = lastMsg.document ? lastMsg.document.originalFilename : lastMsg.content;
        }
      }

      convos.sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));

      this.conversations = convos;
      this.filteredConversations = [...this.conversations];

      this.searchForm.get('searchTerm')?.valueChanges.subscribe(term => this.filterConversations(term));

    } catch (err) {
      this.error = 'Failed to initialize chat page.';
      console.error(err);
    } finally {
      this.loading$.next(false);
    }
  }

  private async retrieveMessages(chatid: number, userid: string): Promise<Message[]> {
    try {
      const [textMessagesResult, docMessagesResult] = await Promise.all([
        firstValueFrom(this.chatService.getMessagesByChatId(chatid)),
        firstValueFrom(this.docApiService.getDocsByChatId(chatid))
      ]);

      const allMessages: Message[] = [];

      textMessagesResult?.forEach(msg => {
        allMessages.push({
          id: msg.messageid, chatid: msg.chatid, timestamp: new Date(msg.sent_datetime + "Z"),
          senderid: msg.senderid, content: msg.message, document: null,
          type: msg.senderid === userid ? 'sent' : 'received', read_status: msg.read_status
        });
      });

      docMessagesResult?.forEach(docMsg => {
        const [docIdStr, ...filenameParts] = (docMsg.doc || '').split(':');
        const docId = parseInt(docIdStr, 10);
        const originalFilename = filenameParts.join(':');

        if (!isNaN(docId) && originalFilename) {
          allMessages.push({
            id: docMsg.cdID, chatid: docMsg.chatID, timestamp: new Date(docMsg.sentDateTime),
            senderid: docMsg.senderID, content: '',
            document: { id: docId, originalFilename },
            type: docMsg.senderID === userid ? 'sent' : 'received', read_status: true
          });
        }
      });

      return allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (err) {
      this.error = 'Error retrieving messages';
      return [];
    }
  }

  async setActiveConversation(conversation: Conversation): Promise<void> {
    if (this.activeConversation?.id === conversation.id) return;

    this.messagesLoading$.next(true);
    this.activeConversation = conversation;
    this.cdr.detectChanges(); // Update view immediately

    const unreadMessages = conversation.messages.filter(msg => !msg.read_status && msg.senderid !== this.currentUser.userid);
    if (unreadMessages.length > 0) {
      conversation.unreadCount = 0;
      const updatePromises = unreadMessages.map(msg => firstValueFrom(this.chatService.updateStatus(msg.id, true)));
      await Promise.all(updatePromises);
    }

    this.messagesLoading$.next(false);
    this.shouldScrollToBottom = true;
  }

  async sendMessage(): Promise<void> {
    if (!this.messageForm.valid || !this.activeConversation) return;

    const messageContent = this.messageForm.get('message')?.value;
    const activeConvo = this.activeConversation;
    this.messageForm.reset();

    const newMessage: Message = {
      id: Date.now(), chatid: activeConvo.id, content: messageContent, document: null,
      timestamp: new Date(), senderid: this.currentUser.userid, type: 'sent', read_status: false
    };

    activeConvo.messages.push(newMessage);
    activeConvo.lastMessage = messageContent;
    activeConvo.timestamp = newMessage.timestamp;
    this.shouldScrollToBottom = true;
    this.cdr.detectChanges();

    await this.createMessage(activeConvo.id, messageContent);
  }

  triggerFileUpload(): void {
    this.fileInput.nativeElement.click();
  }

  async onFileSelectedAndUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.activeConversation) return;

    const file = input.files[0];
    const activeConvo = this.activeConversation;
    input.value = '';

    try {
      const uploadedDoc: ChatDocument = await firstValueFrom(this.docApiService.uploadDocument(file, this.currentUser.userid));

      const newChatDocData: NewChatDoc = {
        senderID: this.currentUser.userid,
        chatID: activeConvo.id,
        doc: `${uploadedDoc.id}:${uploadedDoc.originalFilename}`
      };
      await firstValueFrom(this.docApiService.createChatDoc(newChatDocData));

      const docMessage: Message = {
        id: Date.now(), chatid: activeConvo.id, timestamp: new Date(), senderid: this.currentUser.userid,
        content: '', document: { id: uploadedDoc.id, originalFilename: uploadedDoc.originalFilename },
        type: 'sent', read_status: false
      };
      activeConvo.messages.push(docMessage);
      activeConvo.lastMessage = uploadedDoc.originalFilename;
      activeConvo.timestamp = docMessage.timestamp;
      this.shouldScrollToBottom = true;
      this.cdr.detectChanges();
    } catch (err) {
      this.error = 'Failed to upload and send document.';
      console.error(err);
    }
  }

  async downloadDocument(doc: MessageDocument): Promise<void> {
    if (doc.downloading) return;
    doc.downloading = true;
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(this.docApiService.getDocumentDownloadUrl(doc.id));
      window.open(response.downloadUrl, '_blank');
    } catch (err) {
      this.error = 'Could not get download link.';
      console.error(err);
    } finally {
      doc.downloading = false;
      this.cdr.detectChanges();
    }
  }

  // --- Helper and Utility Methods ---
  private handleUnreadCount(messages: Message[]): number {
    return messages.filter(msg => !msg.read_status && msg.senderid !== this.currentUser.userid).length;
  }

  private async getCurrentUserId(): Promise<string> {
    try {
      const result = await this.authService.getCurrentUser();
      const user = result.data?.user;
      if (user) {
        this.currentUser.name = user.user_metadata?.['name'] || 'You';
        return user.id;
      }
    } catch (err) {
      this.error = 'Error retrieving current user ID.';
    }
    return '';
  }

  private async formatConvos(userid: string): Promise<Conversation[]> {
    try {
      const result = await firstValueFrom(this.chatService.getChatById(userid));
      if (!result) return [];

      return result.map(chat => ({
        id: chat.chatid,
        participant: {
          userid: chat.user1.userid === userid ? chat.user2.userid : chat.user1.userid,
          name: '', role: '', degreeid: 0, yearofstudy: 0, bio: '', status: '',
          profile_picture: chat.user1.userid === userid ? chat.user2.profile_picture : chat.user1.profile_picture
        },
        lastMessage: '', unreadCount: 0, timestamp: null, messages: []
      }));
    } catch (err) {
      this.error = 'Error formatting chat data.';
      return [];
    }
  }

  private async getOtherUserName(convo: Conversation): Promise<string | undefined> {
    try {
      const result = await this.authService.getUserById(convo.participant.userid);
      return result?.data?.name;
    } catch (err) {
      this.error = `Error retrieving username for ${convo.participant.userid}.`;
      return undefined;
    }
  }

  private async createMessage(chatid: number, messageContent: string): Promise<void> {
    try {
      const newMessage: ChatMessage = {
        messageid: 0, chatid, senderid: this.currentUser.userid,
        sent_datetime: new Date(), message: messageContent, read_status: false
      };
      await firstValueFrom(this.chatService.createMessage(newMessage));
    } catch (err) {
      this.error = 'Failed to send message.';
    }
  }

  getAvatarAriaLabel(conversation: Conversation): string {
    return `${conversation.participant.name} avatar`;
  }

  getMessageAriaLabel(message: Message): string {
    const timeText = this.formatTime(message.timestamp);
    const typeText = message.type === 'sent' ? 'You sent' : 'Received';
    return `${typeText} at ${timeText}: ${message.content}`;
  }

  getConversationAriaLabel(conversation: Conversation): string {
    const unreadText = conversation.unreadCount > 0
      ? `, ${conversation.unreadCount} unread messages`
      : '';

    return `${conversation.participant.name} direct message, last message: ${conversation.lastMessage}${unreadText}`;
  }

  filterConversations(searchTerm: string): void {
    const term = searchTerm.toLowerCase();
    this.filteredConversations = this.conversations.filter(convo =>
      convo.participant.name.toLowerCase().includes(term)
    );
  }

  formatTime(date: Date): string {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayMidnight = new Date(todayMidnight);
    yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);

    if (date >= todayMidnight) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (date >= yesterdayMidnight) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  handleImageError(event: Event, conversation: any): void {
    const imageUrl = conversation.participant.profile_picture;
    this.imageErrors.add(imageUrl);
    if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
    this.cdr.detectChanges();
  }

  isImageLoadingError(conversation: any): boolean {
    return this.imageErrors.has(conversation.participant.profile_picture);
  }

  onImageLoad(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    this.imageErrors.delete(imgElement.src);
  }

  // TrackBy functions for performance
  trackByConversationId = (index: number, conversation: Conversation): number => conversation.id;
  trackByMessageId = (index: number, message: Message): number => message.id;
  trackByIndex = (index: number): number => index;
}
