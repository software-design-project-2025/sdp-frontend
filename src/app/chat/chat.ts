import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChatService } from '../services/chat.service';
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
  content: string;
  timestamp: Date;
  senderId: String;
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
export class Chat implements OnInit {
  chats: any[] = [];
  data: any;   
  //otherUser: User;
  
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
    private userService: UserService,
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
      // Run these sequentially
      const userid = await this.getCurrentUserId();

      const otherUserIds = await this.getOtherUsersIds(userid);
      const chatters = [];

      for (const id of otherUserIds){
        const name =  await this.getOtherUserName(id); 
        chatters.push(name);
      }
      //check for undefined chatters
      const definedChatters: string[] = chatters.filter((item): item is string => item !== undefined);
      await this.loadChat(definedChatters);


    // Run these in parallel
      await Promise.all([
        
      ]);

      this.searchForm.get('searchTerm')?.valueChanges.subscribe(term => {
        this.filterConversations(term);
      });
    }
    catch{
      this.error = 'Error retrieving chat data';
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
      this.error = 'Error retrieving chat data';
    }
    return '';
  }

  private async getOtherUsersIds(userid: string): Promise<string[]> {
    try{
      const result = await firstValueFrom(this.chatService.getChatById(userid));
      console.log(result)
      if (!result) {
        this.error = 'No chat found';
        console.log("could not get chat");
        return [];
      }

      const otherUserIds: string[] = [];
     
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
        otherUserIds.push(otherUserId);
      }

      return otherUserIds;
      
    }
    catch{
      this.error = 'Error retrieving chat data';
      return [];
    }
    
  }

  private async getOtherUserName(id: string): Promise<string | undefined> {
    
    try{
      //Check validity of UUID
      const result = await this.authService.getUserById(id);
      if(result){
        return result.data?.name;
      }
      return '';
      
    }
    catch{
      this.error = 'Error retrieving chat data';
      return '';      
    }
  }

  private async loadChat(chatters: string[]): Promise<void> {

    /*const apiConversation: Conversation = {
      id: chat.chatid,
      participant: {
        id: otherUser.userid,
        name: otherUser.username,
        bio: otherUser.bio || '',
        profile_picture: otherUser.profile_picture || 'placeholder'
      },
      lastMessage: 'Start a conversation',
      timestamp: new Date(),
      unreadCount: 0,
      messages: []
    };*/

  }

  private loadChats(userid: string): void {
    
    this.error = '';

    this.chatService.getChatById(userid).subscribe({
      next: async (response: any) => {
        this.data = response;

        if (!response) {
          this.error = 'Invalid chat data received';
          console.log('Invalid chat data received');
          return;
        }

        const chats: Conversation[] = [];
        

        for (const chat of response) {
          const user1Id = chat.user1?.userid;
          const user2Id = chat.user2?.userid;
          const currentId = userid;

          const isUser1Current = user1Id === currentId;
          const isUser2Current = user2Id === currentId;

          if (!isUser1Current && !isUser2Current) {
            this.error = 'You are not part of this conversation';
            return;
          }

          const currentUserFromApi = isUser1Current ? chat.user1 : chat.user2;
          const otherUser = isUser1Current ? chat.user2 : chat.user1;

          this.currentUser.userid = currentUserFromApi.userid;
          this.currentUser.name = currentUserFromApi.username;
          this.currentUser.bio = currentUserFromApi.bio || this.currentUser.bio;
          this.currentUser.profile_picture = currentUserFromApi.profile_picture || this.currentUser.profile_picture;
          try {
              console.log('Querying profiles table for userid:', otherUser.userid);
              // Call your userService and log the result
              const userDetails = await this.userService.getUserById(otherUser.userid);
              console.log('User details from service:', userDetails);
          } catch (error) {
              console.error('Error fetching user details:', error);
          }
          
        }

        /*try {
          const userResults = await Promise.all(userPromises);
          userResults.forEach((result, index) => {
            console.log(`User ${index}:`, result);
            // Process each result here
          });
        } catch (error) {
          console.error('Error fetching users:', error);
        }*/

          /*
          const apiConversation: Conversation = {
            id: chat.chatid,
            participant: {
              id: otherUser.userid,
              name: otherUser.username,
              bio: otherUser.bio || '',
              profile_picture: otherUser.profile_picture || 'placeholder'
            },
            lastMessage: 'Start a conversation',
            timestamp: new Date(),
            unreadCount: 0,
            messages: []
          };

          chats.push(apiConversation);*/
        
        /*
        this.conversations = chats;
        this.filteredConversations = [...this.conversations];

        if (this.conversations.length > 0) {
          this.setActiveConversation(this.conversations[0]);
        }

        this.loading$.next(false);
        this.cdr.detectChanges();*/
      },
      error: (err) => {
        //this.loading = false;
        this.error = `Failed to load chat: ${err.message || 'Unknown error'}`;
      }
    });
  }


  /*initializeSampleConversations(): Conversation[] {
    return [
      {
        id: 1,
        participant: this.users[0], // Sarah Wang
        lastMessage: 'Should we meet at the library tomorrow?',
        timestamp: new Date(new Date().setHours(14, 30, 0)),
        unreadCount: 2,
        messages: [
          {
            id: 1,
            content: 'Hey! Are you free to study calculus tomorrow?',
            timestamp: new Date(new Date().setHours(14, 15, 0)),
            senderId: 2,
            type: 'received'
          },
          {
            id: 2,
            content: 'Yes! I need help with integration techniques.',
            timestamp: new Date(new Date().setHours(14, 20, 0)),
            senderId: 1,
            type: 'sent'
          },
          {
            id: 3,
            content: 'Perfect! I just finished that chapter. Should we meet at the library?',
            timestamp: new Date(new Date().setHours(14, 25, 0)),
            senderId: 2,
            type: 'received'
          },
          {
            id: 4,
            content: 'That sounds great! Floor 3 study rooms?',
            timestamp: new Date(new Date().setHours(14, 28, 0)),
            senderId: 1,
            type: 'sent'
          },
          {
            id: 5,
            content: 'Should we meet at the library tomorrow?',
            timestamp: new Date(new Date().setHours(14, 30, 0)),
            senderId: 2,
            type: 'received'
          }
        ]
      },
      {
        id: 2,
        participant: this.users[1], // Emma Davis
        lastMessage: 'Thanks for the physics help!',
        timestamp: new Date(new Date().setHours(11, 20, 0)),
        unreadCount: 0,
        messages: [
          {
            id: 20,
            content: 'Could you help me with the momentum problems?',
            timestamp: new Date(new Date().setHours(11, 15, 0)),
            senderId: 3,
            type: 'received'
          },
          {
            id: 21,
            content: 'Sure! Let me explain the concept step by step.',
            timestamp: new Date(new Date().setHours(11, 18, 0)),
            senderId: 1,
            type: 'sent'
          },
          {
            id: 22,
            content: 'Thanks for the physics help!',
            timestamp: new Date(new Date().setHours(11, 20, 0)),
            senderId: 3,
            type: 'received'
          }
        ]
      }
    ];
  }*/

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
    
    // In a real app, you might want to load more messages here
  }

  sendMessage(): void {
    if (this.messageForm.valid && this.activeConversation) {
      const messageContent = this.messageForm.get('message')?.value;
      
      const newMessage: Message = {
        id: Date.now(), // Using timestamp as ID for simplicity
        content: messageContent,
        timestamp: new Date(),
        senderId: this.currentUser.userid,
        type: 'sent'
      };
      
      // Add message to active conversation
      this.activeConversation.messages.push(newMessage);
      
      // Update last message and timestamp
      this.activeConversation.lastMessage = messageContent;
      this.activeConversation.timestamp = new Date();
      
      // Clear the input field
      this.messageForm.reset();
    
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