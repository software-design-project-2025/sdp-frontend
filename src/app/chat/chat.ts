import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChatMessage, ChatService } from '../services/chat.service';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { UserApiService } from '../services/user.service';


// Interface definitions
export interface User {
  userid: string;
  name: string,
  role: String;
  degreeid: number;
  yearofstudy: number;
  bio: string;
  status: String;
  profile_picture: string;
}

interface Message {
  id: number;
  chatid: number;
  timestamp: Date;
  senderid: string;
  content: string;
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
  imports: [
    CommonModule,       
    ReactiveFormsModule  
  ],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class Chat implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  private shouldScrollToBottom = false;
  private imageErrors = new Set<string>();

  // Loading states
  loading$ = new BehaviorSubject<boolean>(true);
  loading = this.loading$.asObservable();
  messagesLoading$ = new BehaviorSubject<boolean>(false);
  messagesLoading = this.messagesLoading$.asObservable();
  error: string = ''; 
  
  searchForm: FormGroup;
  messageForm: FormGroup;
  
  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  activeConversation: Conversation | null = null;
  
  currentUser: User = {
    userid: '',
    name: '',
    role: '',
    degreeid: 0,
    yearofstudy: 0,
    bio: '',
    status: '',
    profile_picture: "placeholder"
  };

  constructor(
    private fb: FormBuilder,
    private chatService: ChatService,
    private authService: AuthService,
    private UserService: UserApiService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchForm = this.fb.group({
      searchTerm: ['']
    });

    this.messageForm = this.fb.group({
      message: ['', Validators.required]
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottomSmooth();
      this.shouldScrollToBottom = false;
    }
  }

  // Clean up blob URLs when component is destroyed
  ngOnDestroy(): void {
    // Revoke any blob URLs to prevent memory leaks
    this.conversations.forEach(conversation => {
      const profilePic = conversation.participant.profile_picture;
      if (profilePic && profilePic.startsWith('blob:')) {
        URL.revokeObjectURL(profilePic);
      }
    });
  }

  private scrollToBottomSmooth(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth'
        });
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  async ngOnInit(): Promise<void> {
    try {
      this.loading$.next(true);
      
      // These run sequentially
      const userid = await this.getCurrentUserId();
      this.currentUser.userid = userid;

      const convos = await this.formatConvos(userid);
      const user = await firstValueFrom(this.UserService.getUserById(userid));
      const convosWithoutMessages = [];       
      const convosWithMessages = [];
      const partnerID = this.chatService.getPartnerID();  
    
      for (const convo of convos) {
        const name = await this.getOtherUserName(convo);

        if (name === undefined) {
          continue; //ADD PROPER ERROR HANDLING
        } else {
          convo.participant.name = name;
        }
        
        if (partnerID && (partnerID == convo.participant.userid)) { 
          this.setActiveConversation(convo);
        }
        
        const messages = await this.retrieveMessages(convo.id, userid); 
        const unreadCount = this.handleUnreadCount(messages);
        convo.unreadCount = unreadCount;
        convo.messages = messages;
        if (messages.length > 0) {
          convo.timestamp = messages[messages.length-1].timestamp;
          convosWithMessages.push(convo);
        }
        else{
          convosWithoutMessages.push(convo);
        }
      }
      
      // Sort convos by date
      convosWithMessages.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      this.conversations = [...convosWithMessages, ...convosWithoutMessages];
      this.filteredConversations = [...this.conversations];

      this.loading$.next(false);

      // Subscribe to search form changes
      this.searchForm.get('searchTerm')?.valueChanges.subscribe(term => {
        this.filterConversations(term);
      });
    }
    catch {
      this.error = 'Page failed';
      this.loading$.next(false);
    }
  }

  private handleUnreadCount(messages: Message[]): number {
    let unreadCount = 0;
    
    for (const message of messages){
      if (message.read_status == false && message.senderid != this.currentUser.userid){
        unreadCount++;
      }
    }
    return unreadCount;
  }

  private async getCurrentUserId(): Promise<string> {
    try { 
      const result = await this.authService.getCurrentUser();
      const user = result.data?.user;      
      if (user) {
        this.currentUser.name = user.user_metadata?.['name'] || '';
        return user.id || '';
      }
    }
    catch {
      this.error = 'Error retrieving current userId';
    }
    return '';
  }

  private async formatConvos(userid: string): Promise<Conversation[]> {
    try {
      const result = await firstValueFrom(this.chatService.getChatById(userid));

      if (!result) {
        this.error = 'No chat found';
        console.log("could not get chat");
        return [];
      }

      const convos: Conversation[] = [];
     
      for (const chat of result) {
        let user1Id = chat.user1.userid;
        let user2Id = chat.user2.userid;
        const currentId = userid;

        const isUser1Current = user1Id === currentId;
        const isUser2Current = user2Id === currentId;

        if (!isUser1Current && !isUser2Current) {
          this.error = 'You are not part of this conversation';
          continue;
        }

        const otherUserId = isUser1Current ? chat.user2.userid : chat.user1.userid;
        const otherUserProfilePic = isUser1Current ? chat.user2.profile_picture : chat.user1.profile_picture;

        convos.push({
          id: chat.chatid,
          participant: {
            userid: otherUserId,
            name: '',
            role: '',
            degreeid: 0,
            yearofstudy: 0,
            bio: '',
            status: '',
            profile_picture: otherUserProfilePic || 'placeholder'
          },
          lastMessage: '',
          unreadCount: 0,
          timestamp: null,
          messages: []
        });
      }      

      return convos;
    }
    catch {
      this.error = 'Error formatting chat data';
      return [];
    }
  }

  private async getOtherUserName(convo: Conversation): Promise<string | undefined> {
    try {
      // Check validity of UUID
      const result = await this.authService.getUserById(convo.participant.userid);
      if (result) {
        return result.data?.name;
      } 
      return '';
    }
    catch {
      this.error = 'Error retrieving other username';   
      return '';
    }
  }

  private async retrieveMessages(chatid: number, userid: String): Promise<Message[]> {
    try {
      const result = await firstValueFrom(this.chatService.getMessagesByChatId(chatid));
      
      if (result.length > 0) {
        const messages: Message[] = [];
        
        for (const message of result) {
          // Parse as UTC (assuming the stored time is in GMT+2)
          const utcDate = new Date(message.sent_datetime + "Z");
          
          messages.push({
            id: message.messageid,
            chatid: message.chatid,
            timestamp: utcDate,
            senderid: message.senderid,
            content: message.message,
            type: (message.senderid === userid) ? 'sent' : 'received',
            read_status: message.read_status
          });
        }

        messages.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });
        
        return messages;
      }
      return [];
    }
    catch {
      this.error = 'Error retrieving messages';   
      return [];
    }
  }

  // TrackBy functions for performance optimization
  trackByConversationId(index: number, conversation: Conversation): number {
    return conversation.id;
  }

  trackByMessageId(index: number, message: Message): number {
    return message.id;
  }

  // For skeleton loading items
  trackByIndex(index: number): number {
    return index;
  }

  // Accessibility helper methods
  getConversationAriaLabel(conversation: Conversation): string {
    const unreadText = conversation.unreadCount > 0 
      ? `, ${conversation.unreadCount} unread messages` 
      : '';
    
    return `${conversation.participant.name} direct message, last message: ${conversation.lastMessage}${unreadText}`;
  }

  getAvatarAriaLabel(conversation: Conversation): string {
    return `${conversation.participant.name} avatar`;
  }

  getMessageAriaLabel(message: Message): string {
    const timeText = this.formatTime(message.timestamp);
    const typeText = message.type === 'sent' ? 'You sent' : 'Received';
    return `${typeText} at ${timeText}: ${message.content}`;
  }

  filterConversations(searchTerm: string): void {
    if (!searchTerm) {
      this.filteredConversations = [...this.conversations];
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredConversations = this.conversations.filter(conversation => {
      return conversation.participant.name.toLowerCase().includes(term);
    });
  }

  async setActiveConversation(conversation: Conversation): Promise<void> {
    this.messagesLoading$.next(true);

    // Mark as read when selecting conversation
    conversation.unreadCount = 0;
    this.activeConversation = conversation;

    //Mark unread messages as read
    const updatePromises = [];
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      if (conversation.messages[i].read_status == false && conversation.messages[i].senderid != this.currentUser.userid) {
        const promise = firstValueFrom(this.chatService.updateStatus(conversation.messages[i].id, true))
        updatePromises.push(promise);
      } else {
        break;
      }
    }
    
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    
    this.messagesLoading$.next(false);
    
    // Scroll to bottom when switching conversations
    this.shouldScrollToBottom = true;
  }

  private async createMessage(chatid: number, messageContent: string): Promise<void> {
    try {
      const newMessage: ChatMessage = {
        messageid: 0,
        chatid: chatid,
        senderid: this.currentUser.userid,
        sent_datetime: new Date(),
        message: messageContent,
        read_status: false
      };
      
      const result = await firstValueFrom(this.chatService.createMessage(newMessage));
      if (!result) {
        this.error = "Failed to send message";
        console.log("Failed to send!!!");
      }
    }
    catch {
      this.error = "Failed to send message";
    }
  }

  async sendMessage(): Promise<void> {
    if (this.messageForm.valid && this.activeConversation) {
      const messageContent = this.messageForm.get('message')?.value; 
      const newMessage: Message = {
        id: 0, // Auto increment set in Spring
        chatid: this.activeConversation.id,
        content: messageContent,
        timestamp: new Date(),
        senderid: this.currentUser.userid,
        type: 'sent',
        read_status: false
      };
      this.messageForm.reset(); // Clear the input field

      this.activeConversation.messages.push(newMessage); // Add message to active conversation
      this.shouldScrollToBottom = true;

      await this.createMessage(this.activeConversation.id, messageContent);
      
      // Update last message and timestamp
      this.activeConversation.lastMessage = messageContent;
      this.activeConversation.timestamp = new Date();
    }
  }

  formatTime(date: Date): string {
    const now = new Date();
    
    // Get midnight of today
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    
    // Get midnight of yesterday
    const yesterdayMidnight = new Date(todayMidnight);
    yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);
    
    if (date >= todayMidnight) {
      // Today - show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date >= yesterdayMidnight) {
      // Yesterday
      return 'Yesterday at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // Older - show date
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  handleImageError(event: Event, conversation: any): void {
    const imgElement = event.target as HTMLImageElement;
    const imageUrl = conversation.participant.profile_picture;
    
    // Add to error tracking
    this.imageErrors.add(imageUrl);
    
    // Clean up blob URL if it's a blob
    if (imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
    
    // Trigger change detection
    this.cdr.detectChanges();
  }

  isImageLoadingError(conversation: any): boolean {
    return this.imageErrors.has(conversation.participant.profile_picture);
  }

  onImageLoad(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    const imageUrl = imgElement.src;
    
    // Remove from error tracking if it was previously marked as failed
    this.imageErrors.delete(imageUrl);
  }
}