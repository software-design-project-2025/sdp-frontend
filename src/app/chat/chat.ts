import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChatMessage, GroupMessage, ChatService } from '../services/chat.service';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { UserApiService } from '../services/user.service';
import { DocApiService, NewChatDoc, NewGroupDoc, Document as chatDocument } from '../services/doc.service';

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
  document: MessageDocument | null;
  type: 'sent' | 'received'; 
  read_status: boolean; 
}

interface ExtendedGroupMessage extends GroupMessage {
  type: 'sent' | 'received';
  sender?: User; // Optional user object for sender details
  timestamp: Date;
  content: string;
  document: MessageDocument | null;
  id: number;
}

interface Conversation {
  id: number;
  participant: User;
  lastMessage: string;
  timestamp: Date | null;
  unreadCount: number;
  messages: Message[];
}

interface GroupConversation {
  id: number;
  name: string;
  participants: User[];
  lastMessage: string;
  timestamp: Date | null;
  unreadCount: number;
  messages: ExtendedGroupMessage[];
}

interface MessageDocument {
  id: number;
  originalFilename: string;
  downloading?: boolean;
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
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;
  private shouldScrollToBottom = false;
  private imageErrors = new Set<string>();
  isDragging = false;

  // Loading states
  loading$ = new BehaviorSubject<boolean>(true);
  loading = this.loading$.asObservable();
  messagesLoading$ = new BehaviorSubject<boolean>(false);
  messagesLoading = this.messagesLoading$.asObservable();
  error: string = ''; 
  
  searchForm: FormGroup;
  messageForm: FormGroup;
  
  conversations: Conversation[] = [];
  filteredConversations: (Conversation | GroupConversation)[] = [];
  private allConversations: (Conversation | GroupConversation)[] = [];
  activeConversation: Conversation | GroupConversation | null = null;
  
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
    private cdr: ChangeDetectorRef,
    private docApiService: DocApiService
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

  ngOnDestroy(): void {
    this.conversations.forEach(conversation => {
      if (!this.isGroupConversation(conversation)) {
        const profilePic = conversation.participant.profile_picture;
        if (profilePic && profilePic.startsWith('blob:')) {
          URL.revokeObjectURL(profilePic);
        }
      }
    });
  }

  // drag-and-drop handler methods
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    // Only show the drop zone if a conversation is active
    if (this.activeConversation) {
      this.isDragging = true;
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    // Check if files were dropped and a conversation is active
    if (!this.activeConversation || !event.dataTransfer?.files?.length) {
      return;
    }

    const file = event.dataTransfer.files[0];
    // We'll just handle the first file dropped
    if (file) {
      this.handleFileUpload(file); // Call the new reusable handler
    }
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
      
      const userid = await this.getCurrentUserId();
      this.currentUser.userid = userid;

      const convos = await this.formatConvos(userid);
      const groupConvos = await this.retrieveGroupConvos(userid);
      const partnerID = this.chatService.getPartnerID(); 
      const sessionId = this.chatService.getSessionGroupId();
      const isSoloConvo = this.chatService.getActiveConversationStatus(); 

      const convosWithoutMessages = [];       
      const convosWithMessages = [];
      
      for (const convo of convos) {
        const name = await this.getOtherUserName(convo);

        if (name === undefined) {
          continue;
        } else {
          convo.participant.name = name;
        }
        
        if (partnerID && (partnerID == convo.participant.userid) && isSoloConvo) { 
          this.setActiveConversation(convo);
        }
        
        const messages = await this.retrieveMessages(convo.id, userid); 
        const unreadCount = this.handleUnreadCount(messages);
        convo.unreadCount = unreadCount;
        convo.messages = messages;
        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          convo.timestamp = lastMsg.timestamp;
          convo.lastMessage = lastMsg.document ? `📄 ${lastMsg.document.originalFilename}` : lastMsg.content;
          convosWithMessages.push(convo);
        }
        else{
          convosWithoutMessages.push(convo);
        }
      }

      // Process group conversations
      const groupConvosWithMessages = [];
      const groupConvosWithoutMessages = [];
      for (const groupConvo of groupConvos) {
        if (sessionId && (sessionId == groupConvo.id) && !isSoloConvo){
          this.setActiveConversation(groupConvo);
        }
        // Retrieve group messages
        const groupMessages = await this.retrieveGroupMessages(groupConvo.id, groupConvo.participants);
        groupConvo.messages = groupMessages;
        groupConvo.unreadCount = 0; // Implement read status for groups later if needed
        
        if (groupMessages.length > 0) {
          const lastMsg = groupMessages[groupMessages.length - 1];
          groupConvo.timestamp = lastMsg.timestamp;
          groupConvo.lastMessage = lastMsg.document ? `📄 ${lastMsg.document.originalFilename}` : lastMsg.content;
          groupConvosWithMessages.push(groupConvo);
        } else {
          groupConvo.timestamp = null;
          groupConvo.lastMessage = '';
          groupConvosWithoutMessages.push(groupConvo);
        }
      }
      
    // Combine all conversations with messages and sort them together
    const allConversationsWithMessages = [
      ...convosWithMessages.map(convo => ({ ...convo, type: 'individual' as const })),
      ...groupConvosWithMessages.map(convo => ({ ...convo, type: 'group' as const }))
    ].sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Combine all conversations without messages
    const allConversationsWithoutMessages = [
      ...convosWithoutMessages.map(convo => ({ ...convo, type: 'individual' as const })),
      ...groupConvosWithoutMessages.map(convo => ({ ...convo, type: 'group' as const }))
    ];

    // Store individual conversations separately
    this.conversations = [...convosWithMessages, ...convosWithoutMessages];

    // Combine sorted conversations with messages and conversations without messages
    this.allConversations = [...allConversationsWithMessages, ...allConversationsWithoutMessages];
    this.filteredConversations = [...this.allConversations];

      this.loading$.next(false);

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

  private async retrieveGroupConvos(userid: string): Promise<GroupConversation[]> {
    try {
      const result = await firstValueFrom(this.chatService.getGroups(userid));

      if (!result) {
        this.error = 'No group chat found';
        return [];
      }

      const groupConvos: GroupConversation[] = []; 

      const groupPromises = result.map(async (group) => {
        const groupConvo: GroupConversation = {
          id: group.groupid,
          name: group.title,
          participants: [],
          lastMessage: '',
          timestamp: null,
          unreadCount: 0,
          messages: []
        };

        await this.getGroupData(groupConvo);
        return groupConvo;
      });

      const populatedGroupConvos = await Promise.all(groupPromises);
      return populatedGroupConvos;
    } catch (error) {
      this.error = 'Error formatting group chat data';
      console.error('Error in retrieveGroupConvos:', error);
      return [];      
    }
  }

  private async getGroupData(groupConvo: GroupConversation): Promise<void> {
    try {
      const members = await firstValueFrom(this.chatService.getGroupMembers(groupConvo.id));
      if (!members || members.length === 0) {
        this.error = 'Could not find group members';
        groupConvo.participants = [];
      }

      const users: User[] = await Promise.all(
        members.map(async (member) => {
          try {
            const [supabaseData, postgresData] = await Promise.all([
              this.authService.getUserById(member.userid),
              firstValueFrom(this.UserService.getUserById(member.userid))
            ]);

            if (!supabaseData) {
              console.log(`Could not find user in Supabase: ${member.userid}`);
            }

            if (!postgresData) {
              console.log(`Could not find user in Postgres: ${member.userid}`);
            }

            return {
              userid: member.userid,
              name: supabaseData?.data?.name || '',
              role: postgresData[0]?.role || '',
              degreeid: postgresData[0]?.degreeid || '',
              yearofstudy: postgresData[0]?.yearofstudy || 0,
              bio: postgresData[0]?.bio || '',
              status: postgresData[0]?.status || '',
              profile_picture: postgresData[0]?.profile_picture || ''
            } as User;
          } catch (memberError) {
            console.error(`Error processing member ${member.userid}:`, memberError);
            return {
              userid: member.userid,
              name: '',
              role: '',
              degreeid: 0,
              yearofstudy: 0,
              bio: '',
              status: 'error',
              profile_picture: ''
            } as User;
          }
        })
      );

      groupConvo.participants = users;
      
    } catch (error) {
      this.error = 'Error getting group chat members';
      console.error('Error getting group chat members for group:', groupConvo.id, error);
      groupConvo.participants = [];
    }
  }

  private async retrieveGroupMessages(groupid: number, participants: User[]): Promise<ExtendedGroupMessage[]> {
    try {
        // 1. Fetch text and doc messages in parallel
        const [textMessagesResult, docMessagesResult] = await Promise.all([
            firstValueFrom(this.chatService.getGroupMessages(groupid)),
            firstValueFrom(this.docApiService.getGroupDocsByGroupId(groupid))
        ]);


        const allMessages: ExtendedGroupMessage[] = [];

        // 2. Process text messages
        if (textMessagesResult && textMessagesResult.length > 0) {
            for (const message of textMessagesResult) {
                const utcDate = new Date(message.sent_datetime + "Z");
                const sender = participants.find(p => p.userid === message.senderid);
                
                allMessages.push({
                    id: message.messageid,
                    messageid: message.messageid,
                    groupid: message.groupid,
                    sent_datetime: message.sent_datetime,
                    timestamp: utcDate,
                    senderid: message.senderid,
                    content: message.message,
                    document: null,
                    message: message.message,
                    type: (message.senderid === this.currentUser.userid) ? 'sent' : 'received',
                    sender: sender
                });
            }
        }

        // 3. Process document messages
        if (docMessagesResult && docMessagesResult.length > 0) {
            for (const docMsg of docMessagesResult) {
                const [docIdStr, ...filenameParts] = (docMsg.doc || '').split(':');
                const docId = parseInt(docIdStr, 10);
                const originalFilename = filenameParts.join(':');
                const sender = participants.find(p => p.userid === docMsg.senderid);
                if (!isNaN(docId) && originalFilename && docMsg.sent_datetime) {
                    const timestamp = new Date(docMsg.sent_datetime + "Z");
                    allMessages.push({
                        id: docMsg.docid,
                        messageid: docMsg.docid,
                        groupid: docMsg.groupid,
                        sent_datetime: docMsg.sent_datetime,
                        timestamp: timestamp,
                        senderid: docMsg.senderid,
                        content: '',
                        document: {
                            id: docId,
                            originalFilename: originalFilename
                        },
                        message: '',
                        type: (docMsg.senderid === this.currentUser.userid) ? 'sent' : 'received',
                        sender: sender
                    });
                }
            }
        }

        // 4. Sort all messages chronologically
        allMessages.sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });
        
        return allMessages;

    } catch (err) {
        this.error = 'Error retrieving group messages';
        console.error("Error in retrieveGroupMessages:", err);
        return [];
    }
  }

  private async getOtherUserName(convo: Conversation): Promise<string | undefined> {
    try {
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
     // Fetch text messages and document messages in parallel
      const [textMessagesResult, docMessagesResult] = await Promise.all([
        firstValueFrom(this.chatService.getMessagesByChatId(chatid)),
        firstValueFrom(this.docApiService.getDocsByChatId(chatid))
      ]);
      const allMessages: Message[] = [];

      // Process text messages
      if (textMessagesResult) {
        for (const message of textMessagesResult) {
          const utcDate = new Date(message.sent_datetime + "Z");
          allMessages.push({
            id: message.messageid,
            chatid: message.chatid,
            timestamp: utcDate,
            senderid: message.senderid,
            content: message.message,
            document: null, 
            type: (message.senderid === userid) ? 'sent' : 'received',
            read_status: message.read_status
          });
        }
      }

      // Process document messages
      if (docMessagesResult) {
        for (const docMsg of docMessagesResult) {
          const [docIdStr, ...filenameParts] = (docMsg.doc || '').split(':');
          const docId = parseInt(docIdStr, 10);
          const originalFilename = filenameParts.join(':');

          if (!isNaN(docId) && originalFilename) {
            const timestamp = new Date(docMsg.sentDateTime);
            allMessages.push({
              id: docMsg.cdID, // Use the unique chat_doc ID
              chatid: docMsg.chatID,
              timestamp: timestamp,
              senderid: docMsg.senderID,
              content: '',
              document: {
                id: docId,
                originalFilename: originalFilename
              },
              type: (docMsg.senderID === userid) ? 'sent' : 'received',
              read_status: true // Assume docs are always "read"
            });
          }
        }
      }

      // Sort all messages (text and docs) chronologically
      allMessages.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
      return allMessages;

    } catch (err) {
      this.error = 'Error retrieving messages'; 
      console.error("Error in retrieveMessages:", err);
      return [];
    }
  }

  trackByConversationId(index: number, conversation: Conversation | GroupConversation): number {
    return conversation.id;
  }

  isGroupConversation(convo: any): convo is GroupConversation {
    return 'participants' in convo && Array.isArray(convo.participants);
  }

  trackByMessageId(index: number, message: Message | ExtendedGroupMessage): number {
    return message.id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  getConversationAriaLabel(conversation: Conversation | GroupConversation): string {
    const unreadText = conversation.unreadCount > 0 
      ? `, ${conversation.unreadCount} unread messages` 
      : '';

    if (this.isGroupConversation(conversation)) {
      return `${conversation.name} group chat, last message: ${conversation.lastMessage}${unreadText}`;
    } else {
      return `${conversation.participant.name} direct message, last message: ${conversation.lastMessage}${unreadText}`;
    }
  }

  getAvatarAriaLabel(conversation: Conversation | GroupConversation): string {
    if (this.isGroupConversation(conversation)) {
      return `${conversation.name} group avatar`;
    } else {
      return `${conversation.participant.name} avatar`;
    }
  }

  getMessageAriaLabel(message: Message | ExtendedGroupMessage): string {
    const timeText = this.formatTime(message.timestamp);
    const typeText = message.type === 'sent' ? 'You sent' : 'Received';

    if (message.document) {
      const senderName = (this.isGroupMessage(message) && message.sender) ? message.sender.name : typeText;
      return `${senderName} at ${timeText}: document named ${message.document.originalFilename}`;
    }
    
    if (this.isGroupMessage(message) && message.sender) {
      return `${message.sender.name} sent at ${timeText}: ${message.content}`;
    }
    
    return `${typeText} at ${timeText}: ${message.content}`;
  }

  isGroupMessage(message: any): message is ExtendedGroupMessage {
    return 'groupid' in message;
  }

  filterConversations(searchTerm: string): void {
    if (!searchTerm) {
      this.filteredConversations = [...this.allConversations];
      return;
    }

    const term = searchTerm.toLowerCase();
    
    this.filteredConversations = this.allConversations.filter(conversation => {
      if (this.isGroupConversation(conversation)) {
        return conversation.name.toLowerCase().includes(term);
      } else {
        return conversation.participant.name.toLowerCase().includes(term);
      }
    });
  }

  private getGroupConversations(): GroupConversation[] {
    return this.filteredConversations.filter(convo => 
      this.isGroupConversation(convo)
    ) as GroupConversation[];
  }

  getConversationDisplayName(conversation: Conversation | GroupConversation): string {
    if (this.isGroupConversation(conversation)) {
      return conversation.name;
    } else {
      return conversation.participant.name || 'Unknown User';
    }
  }

  getAvatarInitials(conversation: Conversation | GroupConversation): string {
    if (this.isGroupConversation(conversation)) {
      return conversation.name ? conversation.name.charAt(0).toUpperCase() : 'G';
    } else {
      return conversation.participant.name ? conversation.participant.name.charAt(0).toUpperCase() : 'U';
    }
  }

  getSenderInitials(user: User): string {
    return user.name ? user.name.charAt(0).toUpperCase() : 'U';
  }

  async setActiveConversation(conversation: Conversation | GroupConversation): Promise<void> {
    this.messagesLoading$.next(true);

    if (this.isGroupConversation(conversation)) {
      conversation.unreadCount = 0;
      this.activeConversation = conversation;
    } else {
      conversation.unreadCount = 0;
      this.activeConversation = conversation;

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
    }
    
    this.messagesLoading$.next(false);
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
      }
    }
    catch {
      this.error = "Failed to send message";
    }
  }

  private async createGroupMessage(groupid: number, messageContent: string): Promise<void> {
    try {
      const newMessage: GroupMessage = {
        messageid: 0,
        groupid: groupid,
        senderid: this.currentUser.userid,
        sent_datetime: new Date(),
        message: messageContent
      };
      
      const result = await firstValueFrom(this.chatService.createGroupMessage(newMessage));
      if (!result) {
        this.error = "Failed to send group message";
      }
    }
    catch {
      this.error = "Failed to send group message";
    }
  }

  async sendMessage(): Promise<void> {
    const messageContent = this.messageForm.get('message')?.value?.trim();
    if (this.messageForm.valid && this.activeConversation && !this.isGroupConversation(this.activeConversation)) {
      const newMessage: Message = {
        id: 0,
        chatid: this.activeConversation.id,
        content: messageContent,
        timestamp: new Date(),
        senderid: this.currentUser.userid,
        document: null,
        type: 'sent',
        read_status: false
      };
      this.messageForm.reset();

      this.activeConversation.messages.push(newMessage);
      this.shouldScrollToBottom = true;

      await this.createMessage(this.activeConversation.id, messageContent);
      
      this.activeConversation.lastMessage = messageContent;
      this.activeConversation.timestamp = new Date();
    }
  }

  async sendGroupMessage(): Promise<void> {
    const messageContent = this.messageForm.get('message')?.value?.trim();
    if (this.messageForm.valid && this.activeConversation && this.isGroupConversation(this.activeConversation)) {
      const newMessage: ExtendedGroupMessage = {
        id: 0, // Temporary ID, will be replaced by the actual ID from the server
        messageid: 0,
        groupid: this.activeConversation.id,
        senderid: this.currentUser.userid,
        sent_datetime: new Date(),
        message: messageContent,
        content: messageContent,
        document: null,
        timestamp: new Date(),
        type: 'sent',
        sender: this.currentUser
      };

      this.messageForm.reset();

      // Add the message to the active conversation
      this.activeConversation.messages.push(newMessage);
      this.shouldScrollToBottom = true;

      // Send to the server
      await this.createGroupMessage(this.activeConversation.id, messageContent);
      
      // Update conversation metadata
      this.activeConversation.lastMessage = messageContent;
      this.activeConversation.timestamp = new Date();
    }
  }

  formatTime(date: Date): string {
    const now = new Date();
    
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    
    const yesterdayMidnight = new Date(todayMidnight);
    yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);
    
    if (date >= todayMidnight) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date >= yesterdayMidnight) {
      return 'Yesterday at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  handleImageError(event: Event, conversation: Conversation | GroupConversation): void {
    if (!this.isGroupConversation(conversation)) {
      const imgElement = event.target as HTMLImageElement;
      const imageUrl = conversation.participant.profile_picture;
      
      this.imageErrors.add(imageUrl);
      
      if (imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
      
      this.cdr.detectChanges();
    }
  }

  handleSenderImageError(event: Event, user: User): void {
    const imgElement = event.target as HTMLImageElement;
    const imageUrl = user.profile_picture;
    
    this.imageErrors.add(imageUrl);
    
    if (imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
    
    this.cdr.detectChanges();
  }

  isImageLoadingError(conversation: Conversation | GroupConversation): boolean {
    if (this.isGroupConversation(conversation)) {
      return false;
    }
    return this.imageErrors.has(conversation.participant.profile_picture);
  }

  isSenderImageLoadingError(user: User): boolean {
    return this.imageErrors.has(user.profile_picture);
  }

  onImageLoad(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    const imageUrl = imgElement.src;
    
    this.imageErrors.delete(imageUrl);
  }

  triggerFileUpload(): void {
    if (this.messagesLoading$.value || !this.activeConversation) return;
    this.fileInput.nativeElement.click();
  }

  private async handleFileUpload(file: File): Promise<void> {
    if (!this.activeConversation) return;

    const activeConvo = this.activeConversation;

    try {
      const uploadedDoc: chatDocument = await firstValueFrom(
        this.docApiService.uploadDocument(file, this.currentUser.userid)
      );
      const docString = `${uploadedDoc.id}:${uploadedDoc.originalFilename}`;

      if (this.isGroupConversation(activeConvo)) {
        // This is the new logic for groups
        const newGroupDocData: NewGroupDoc = {
            senderid: this.currentUser.userid,
            groupid: activeConvo.id,
            doc: docString
        };
        // Call the correct service method
        await firstValueFrom(this.docApiService.createGroupDoc(newGroupDocData));
        console.log(newGroupDocData)
      } else {
        const newChatDocData: NewChatDoc = {
          senderID: this.currentUser.userid,
          chatID: activeConvo.id,
          doc: docString
        };
        await firstValueFrom(this.docApiService.createChatDoc(newChatDocData));
      }

      const docMessage: Message | ExtendedGroupMessage = {
        id: Date.now(), // Temporary ID
        chatid: activeConvo.id, // For individual
        groupid: activeConvo.id, // For group
        timestamp: new Date(),
        senderid: this.currentUser.userid,
        content: '',
        document: { id: uploadedDoc.id, originalFilename: uploadedDoc.originalFilename },
        type: 'sent',
        read_status: false,
        // Group-specific properties
        message: '',
        sent_datetime: new Date(),
        messageid: Date.now(), // Temporary ID
        sender: this.currentUser
      };
      
      activeConvo.messages.push(docMessage as any);

      activeConvo.lastMessage = `📄 ${uploadedDoc.originalFilename}`;
      activeConvo.timestamp = docMessage.timestamp;
      this.shouldScrollToBottom = true;
      this.cdr.detectChanges();

    } catch (err) {
      this.error = 'Failed to upload and send document.';
      console.error(err);
    }
  }

 async onFileSelectedAndUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    input.value = ''; // Clear the input so the same file can be re-selected

    await this.handleFileUpload(file);
  }

  async downloadDocument(doc: MessageDocument): Promise<void> {
      if (doc.downloading) return; // Prevent multiple clicks
      //console.log(doc);
      doc.downloading = true;
      this.cdr.detectChanges(); // Show loading spinner

      // 1. Open a new, blank tab immediately upon click. This is the key.
      const newTab = window.open('', '_blank');
      if (!newTab) {
        this.error = 'Pop-up was blocked. Please allow pop-ups for this site.';
        doc.downloading = false;
        this.cdr.detectChanges();
        return;
      }
      // Give the user feedback in the new tab while waiting for the URL.
      newTab.document.write('Fetching your download link, please wait...');

      try {
        const response = await firstValueFrom(
          this.docApiService.getDocumentDownloadUrl(doc.id)
        );
        //console.log(response)
        
        // 2. If the URL is received, update the new tab's location to start the download.
        if (response && response.downloadUrl) {
          newTab.location.href = response.downloadUrl;
        } else {
          // Handle cases where the API call succeeds but returns no URL.
          newTab.document.write('Failed to get download link. Please try again.');
          setTimeout(() => newTab.close(), 3000); // Close the error tab after a delay
        }

      } catch (err) {
        this.error = 'Could not get download link.';
        // Inform the user in the new tab that something went wrong.
        newTab.document.write('Error: Could not get download link. You can close this tab.');
        console.error(err);
      } finally {
        doc.downloading = false;
        this.cdr.detectChanges(); // Hide loading spinner
      }
  }
}