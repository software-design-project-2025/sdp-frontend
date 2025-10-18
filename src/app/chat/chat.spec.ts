import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ChatService, ChatMessage, Chat } from '../services/chat.service';
import { environment } from '../../environments/environment.prod';

describe('ChatService', () => {
  let service: ChatService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiBaseUrl;

  const mockMessages: ChatMessage[] = [
    { 
      messageid: 101, 
      chatid: 1, 
      message: 'Hello!', 
      senderid: 'user-2', 
      sent_datetime: new Date('2025-01-01T10:00:00Z'),
      read_status: false 
    },
    { 
      messageid: 102, 
      chatid: 1, 
      message: 'Hi there!', 
      senderid: 'user-1', 
      sent_datetime: new Date('2025-01-01T10:01:00Z'),
      read_status: true 
    }
  ];

  const mockChats: Chat[] = [
    { 
      chatid: 1, 
      user1: { 
        userid: 'user-1', 
        name: 'Alice',
        role: 'student',
        degreeid: 1,
        yearofstudy: 2,
        bio: 'Test bio',
        status: 'active',
        profile_picture: 'pic1.jpg' 
      }, 
      user2: { 
        userid: 'user-2', 
        name: 'Bob',
        role: 'student',
        degreeid: 2,
        yearofstudy: 3,
        bio: 'Test bio 2',
        status: 'active',
        profile_picture: 'pic2.jpg' 
      } 
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ChatService]
    });
    service = TestBed.inject(ChatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getMessagesByChatId', () => {
    it('should fetch messages for a given chat ID', () => {
      const chatId = 1;

      service.getMessagesByChatId(chatId).subscribe(messages => {
        expect(messages.length).toBe(2);
        expect(messages).toEqual(mockMessages);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/chatMessage/getMessage?chatid=${chatId}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${environment.API_KEY_ADMIN}`);
      req.flush(mockMessages);
    });

    it('should handle error when fetching messages fails', () => {
      const chatId = 1;
      const errorMessage = 'Failed to fetch messages';

      service.getMessagesByChatId(chatId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/chatMessage/getMessage?chatid=${chatId}`);
      req.flush(errorMessage, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('createMessage', () => {
    it('should create a new message', () => {
      const newMessage: ChatMessage = {
        messageid: 0,
        chatid: 1,
        senderid: 'user-1',
        message: 'New message',
        sent_datetime: new Date('2025-01-01T10:02:00Z'),
        read_status: false
      };

      const createdMessage: ChatMessage = {
        ...newMessage,
        messageid: 103
      };

      service.createMessage(newMessage).subscribe(message => {
        expect(message).toEqual(createdMessage);
        expect(message.messageid).toBe(103);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/chatMessage/sendMessage`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${environment.API_KEY_ADMIN}`);
      
      // Verify the body matches what the service sends (without messageid)
      expect(req.request.body).toEqual({
        chatid: newMessage.chatid,
        senderid: newMessage.senderid,
        sent_datetime: newMessage.sent_datetime,
        message: newMessage.message
      });
      
      req.flush(createdMessage);
    });

    it('should handle error when creating message fails', () => {
      const newMessage: ChatMessage = {
        messageid: 0,
        chatid: 1,
        senderid: 'user-1',
        message: 'New message',
        sent_datetime: new Date(),
        read_status: false
      };

      service.createMessage(newMessage).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/chatMessage/sendMessage`);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('getChatById', () => {
    it('should fetch chat by user ID', () => {
      const userId = 'user-1';

      service.getChatById(userId).subscribe(chats => {
        expect(chats.length).toBe(1);
        expect(chats[0].chatid).toBe(1);
        expect(chats).toEqual(mockChats);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/chat/getChat?userid=${userId}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${environment.API_KEY_ADMIN}`);
      req.flush(mockChats);
    });

    it('should handle error when fetching chat fails', () => {
      const userId = 'user-1';

      service.getChatById(userId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/chat/getChat?userid=${userId}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('createChat', () => {
    it('should create a new chat', () => {
      const newChat = {
        user1id: 'user-1',
        user2id: 'user-2'
      };

      const createdChat: Chat = mockChats[0];

      service.createChat(newChat).subscribe(chat => {
        expect(chat).toEqual(createdChat);
        expect(chat.chatid).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/chat/createChat`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${environment.API_KEY_ADMIN}`);
      expect(req.request.body).toEqual(newChat);
      req.flush(createdChat);
    });

    it('should handle error when creating chat fails', () => {
      const newChat = {
        user1id: 'user-1',
        user2id: 'user-2'
      };

      service.createChat(newChat).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/chat/createChat`);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('updateStatus', () => {
    it('should update message read status', () => {
      const messageId = 101;
      const readStatus = true;

      service.updateStatus(messageId, readStatus).subscribe(response => {
        expect(response).toBeDefined();
      });

      const req = httpMock.expectOne(`${baseUrl}/api/chatMessage/updateStatus?messageid=${messageId}&read_status=${readStatus}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${environment.API_KEY_ADMIN}`);
      expect(req.request.body).toBeNull();
      req.flush('Success');
    });

    it('should handle error when updating status fails', () => {
      const messageId = 101;
      const readStatus = true;

      service.updateStatus(messageId, readStatus).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/api/chatMessage/updateStatus?messageid=${messageId}&read_status=${readStatus}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('getPartnerID and setPartnerID', () => {
    it('should set and get partner ID', () => {
      const partnerId = 'user-2';
      
      service.setPartnerID(partnerId);
      expect(service.getPartnerID()).toBe(partnerId);
    });

    it('should return null when no partner ID is set', () => {
      expect(service.getPartnerID()).toBeNull();
    });

    it('should update partner ID when set multiple times', () => {
      service.setPartnerID('user-2');
      expect(service.getPartnerID()).toBe('user-2');
      
      service.setPartnerID('user-3');
      expect(service.getPartnerID()).toBe('user-3');
    });

    it('should allow setting partner ID to null', () => {
      service.setPartnerID('user-2');
      expect(service.getPartnerID()).toBe('user-2');
      
      service.setPartnerID(null as any);
      expect(service.getPartnerID()).toBeNull();
    });
  });
});