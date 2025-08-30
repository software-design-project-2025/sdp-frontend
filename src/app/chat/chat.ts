import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../services/chat.service';


// Interface definitions
interface User {
  id: number;
  name: string;
  initials: string;
  online: boolean;
}

interface Group {
  id: number;
  name: string;
  initials: string;
  memberCount: number;
}

interface Message {
  id: number;
  content: string;
  timestamp: Date;
  senderId: number;
  type: 'sent' | 'received';
}

interface Conversation {
  id: number;
  type: 'direct' | 'group';
  participant: User | Group;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  messages: Message[];
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class Chat implements OnInit {
  searchForm: FormGroup;
  messageForm: FormGroup;
  
  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  activeConversation: Conversation | null = null;
  
  currentUser: User = {
    id: 1,
    name: 'You',
    initials: 'YY',
    online: true
  };

  // Sample data - in a real app, this would come from a service
  users: User[] = [
    { id: 2, name: 'Sarah Chen', initials: 'SC', online: true },
    { id: 3, name: 'Emma Davis', initials: 'ED', online: false }
  ];

  groups: Group[] = [
    { id: 101, name: 'Calculus Study Group', initials: 'CSG', memberCount: 6 },
    { id: 102, name: 'Physics Lab Group', initials: 'PLG', memberCount: 4 }
  ];

  constructor(private fb: FormBuilder) {
    this.searchForm = this.fb.group({
      searchTerm: ['']
    });

    this.messageForm = this.fb.group({
      message: ['', Validators.required]
    });
  }


  ngOnInit(): void {
    this.initializeConversations();
    this.filteredConversations = [...this.conversations];
    
    // Set the first conversation as active by default
    if (this.conversations.length > 0) {
      this.setActiveConversation(this.conversations[0]);
    }

    // Listen for search input changes
    this.searchForm.get('searchTerm')?.valueChanges.subscribe(term => {
      this.filterConversations(term);
    });
  }

  initializeConversations(): void {
    // Sample conversations with messages
    this.conversations = [
      {
        id: 1,
        type: 'direct',
        participant: this.users[0], // Sarah Chen
        lastMessage: 'Should we meet at the librar...',
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
        type: 'group',
        participant: this.groups[0], // Calculus Study Group
        lastMessage: 'Mike: I uploaded the notes fr...',
        timestamp: new Date(new Date().setHours(13, 45, 0)),
        unreadCount: 5,
        messages: [] // Would be populated in a real app
      },
      {
        id: 3,
        type: 'direct',
        participant: this.users[1], // Emma Davis
        lastMessage: 'Thanks for the physics help!',
        timestamp: new Date(new Date().setHours(11, 20, 0)),
        unreadCount: 0,
        messages: [] // Would be populated in a real app
      },
      {
        id: 4,
        type: 'group',
        participant: this.groups[1], // Physics Lab Group
        lastMessage: 'Everyone ready for tomorrow?',
        timestamp: new Date(Date.now() - 86400000), // Yesterday
        unreadCount: 1,
        messages: [] // Would be populated in a real app
      }
    ];
  }

  filterConversations(searchTerm: string): void {
    if (!searchTerm) {
      this.filteredConversations = [...this.conversations];
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredConversations = this.conversations.filter(conversation => {
      if (conversation.type === 'direct') {
        const user = conversation.participant as User;
        return user.name.toLowerCase().includes(term);
      } else {
        const group = conversation.participant as Group;
        return group.name.toLowerCase().includes(term);
      }
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
        senderId: this.currentUser.id,
        type: 'sent'
      };
      
      // Add message to active conversation
      this.activeConversation.messages.push(newMessage);
      
      // Update last message and timestamp
      this.activeConversation.lastMessage = messageContent;
      this.activeConversation.timestamp = new Date();
      
      // Clear the input field
      this.messageForm.reset();
      
      // In a real app, you would send the message to a server here
      // and handle the response asynchronously
      
      // Simulate a reply after a short delay
      setTimeout(() => {
        this.simulateReply();
      }, 1000 + Math.random() * 2000);
    }
  }

  simulateReply(): void {
    if (!this.activeConversation) return;
    
    let replyContent = '';
    if (this.activeConversation.type === 'direct') {
      const user = this.activeConversation.participant as User;
      replyContent = `Thanks for your message! (This is an automated reply from ${user.name})`;
    } else {
      const group = this.activeConversation.participant as Group;
      const randomMember = Math.floor(Math.random() * group.memberCount) + 1;
      replyContent = `User${randomMember}: Got it! (This is an automated reply from ${group.name})`;
    }
    
    const replyMessage: Message = {
      id: Date.now(),
      content: replyContent,
      timestamp: new Date(),
      senderId: this.activeConversation.type === 'direct' 
        ? (this.activeConversation.participant as User).id 
        : 0, // 0 could represent a group message from someone
      type: 'received'
    };
    
    this.activeConversation.messages.push(replyMessage);
    this.activeConversation.lastMessage = replyContent;
    this.activeConversation.timestamp = new Date();
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