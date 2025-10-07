import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChatMessage, ChatService, Chat as c } from '../services/chat.service';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { BehaviorSubject,firstValueFrom } from 'rxjs';
import { UserService } from '../services/supabase.service';

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
}

interface Conversation {
  id: number;
  participant: User;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  messages: Message[];
}

@Component({ //Component function called as decorator, passing the metadata below, along with a reference to the Chat class constructor
  selector: 'app-chat', //use this component by placing the tag <app-chat></app-chat> in any other component's HTML template.
  standalone: true,
  imports: [
    CommonModule,       
    ReactiveFormsModule  
  ],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class Chat implements OnInit {
  chats: any[] = [];
  data: any;   

  
  loading$ = new BehaviorSubject<boolean>(true);
  loading = this.loading$.asObservable();
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
    private cdr: ChangeDetectorRef
  ) {
    this.searchForm = this.fb.group({
      searchTerm: ['']
    });

    this.messageForm = this.fb.group({
      message: ['', Validators.required]
    });
  }

  async ngOnInit(): Promise<void> {

    try {
      // These run sequentially
      const userid = await this.getCurrentUserId();
      this.currentUser.userid = userid;

      const convos = await this.formatConvos(userid);       
      const partnerID = this.chatService.getPartnerID();  
    
      for (const convo of convos){

        const name = await this.getOtherUserName(convo);
        if (name === undefined){
          continue; //ADD PROPER ERROR HANDLING
        }else{
          convo.participant.name = name;
        }
        
        if (partnerID && (partnerID == convo.participant.userid)){ 
          this.setActiveConversation(convo);
        }
        
        const messages = await this.retrieveMessages(convo.id, userid); 
        convo.messages = messages;
        if (messages.length > 0){
          convo.timestamp = messages[messages.length-1].timestamp;
        }
      }
      //Sort messages by date
      convos.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());

      this.conversations = convos;
      this.filteredConversations = [...this.conversations];

      this.loading$.next(false);
      this.cdr.detectChanges();

      // These run in parallel
      await Promise.all([
        
      ]);

      this.searchForm.get('searchTerm')?.valueChanges.subscribe(term => {
        this.filterConversations(term);
      });
    }
    catch{
      this.error = 'Page failed';
    }
  }

  private async getCurrentUserId(): Promise<string> {

    try{ 
      const result = await this.authService.getCurrentUser();
      const user = result.data?.user;      
      if (user) {
        this.currentUser.userid = user.id || '';
        this.currentUser.name = user.user_metadata?.['name'] || '';
        return user.id || '';
      }
      return '';   
    }
    catch{
      this.error = 'Error retrieving current userId';
    }
    return '';
  }

  private async formatConvos(userid: string): Promise<Conversation[]> {
    try{
      const result = await firstValueFrom(this.chatService.getChatById(userid));

      if (!result) {
        this.error = 'No chat found';
        console.log("could not get chat");
        return [];
      }

     
      const convos: Conversation[] = [];
     
      for (const chat of result){
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
            profile_picture: 'placeholder'
          },
          lastMessage: '',
          unreadCount: 0,
          timestamp: new Date(),
          messages: []
        })
      }      

      return convos;
      
    }
    catch{
      this.error = 'Error formatting chat data';
      return [];
    }
    
  }

  private async getOtherUserName(convo: Conversation): Promise<string | undefined> {
    
    try{
      //Check validity of UUID
      const result = await this.authService.getUserById(convo.participant.userid);
      if(result){
        return result.data?.name;
      } 
      return ''
    }
    catch{
      this.error = 'Error retrieving other username';   
      return ''
    }
  }

  private async retrieveMessages(chatid: number, userid: String): Promise<Message[]> {

    try{
      const result = await firstValueFrom(this.chatService.getMessagesByChatId(chatid));
      
      if (result.length > 0){
        const messages: Message[] = [];
        
        for (const message of result){
          
          // Parse as UTC (assuming the stored time is in GMT+2)
          const utcDate = new Date(message.sent_datetime + "Z");
          
          messages.push({
            id: message.messageid,
            chatid: message.chatid,
            timestamp: utcDate,
            senderid: message.senderid,
            content: message.message,
            type: (message.senderid === userid) ? 'sent' : 'received'

          })
        }
        
        return messages;
 
      }
      return [];
    }
    catch{
      this.error = 'Error retrieving messages';   
      return [];
    }
  }
  // TrackBy functions for performance optimization
  trackByConversationId(index: number, conversation: Conversation): number {
    // Use a combination of index and id to ensure uniqueness
    return index; // OR return conversation.id + index;
  }

  trackByMessageId(index: number, message: Message): number {
    return message.id;
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

  setActiveConversation(conversation: Conversation): void {
    // Mark as read when selecting conversation
    conversation.unreadCount = 0;
    
    this.activeConversation = conversation;
    
  }

  private async createMessage(chatid: number, messageContent: string): Promise<void>{
    try{
      const newMessage: ChatMessage = {
        messageid: 0,
        chatid: chatid,
        senderid: this.currentUser.userid,
        sent_datetime: new Date(),
        message: messageContent
      }
      
      const result = await firstValueFrom(this.chatService.createMessage(newMessage));
      //console.log(result);
      if(!result){
        this.error = "Failed to send message";
        console.log("Failed to send!!!");
      }
    }
    catch{
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
        type: 'sent'
      };
      this.messageForm.reset(); // Clear the input field

      this.activeConversation.messages.push(newMessage); // Add message to active conversation

      await this.createMessage(this.activeConversation.id, messageContent);
      
      // Update last message and timestamp
      this.activeConversation.lastMessage = messageContent;
      this.activeConversation.timestamp = new Date();
    
    }
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // Today - show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      // Yesterday
      return 'Yesterday';
    } else {
      // Show date
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  initiateCall(isVideo: boolean): void {
    if (!this.activeConversation) return;
    
    const participantName = this.activeConversation.participant.name;
    alert(`Initiating ${isVideo ? 'video' : 'voice'} call with ${participantName}`);
    
    // In a real app, you would implement actual calling functionality here
  }

  showMoreOptions(): void {
    // Implement more options functionality
    alert('More options menu would open here');
  }
}