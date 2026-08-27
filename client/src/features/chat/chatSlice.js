// client/src/features/chat/chatSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// Start or retrieve conversation with a seller
export const startChat = createAsyncThunk(
  'chat/startChat',
  async ({ sellerId, productId, message }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/chat/start', {
        sellerId,
        productId,
        message
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start chat');
    }
  }
);

// Fetch user/seller conversations
export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async ({ role = 'user' } = {}, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/chat/conversations?role=${role}`);
      return response.data.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch conversations');
    }
  }
);

// Fetch messages of a conversation
export const fetchConversationMessages = createAsyncThunk(
  'chat/fetchConversationMessages',
  async (conversationId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/chat/conversations/${conversationId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load messages');
    }
  }
);

// Upload chat image attachment
export const uploadChatImage = createAsyncThunk(
  'chat/uploadImage',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.data; // { url, publicId }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload image');
    }
  }
);

// Send message
export const sendChatMessage = createAsyncThunk(
  'chat/sendChatMessage',
  async ({ conversationId, text, images, product }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/chat/conversations/${conversationId}/messages`, {
        text,
        images,
        product
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

// Mark conversation as read
export const markChatRead = createAsyncThunk(
  'chat/markChatRead',
  async (conversationId, { rejectWithValue }) => {
    try {
      await axiosInstance.put(`/chat/conversations/${conversationId}/read`);
      return conversationId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark read');
    }
  }
);

// Fetch unread count
export const fetchChatUnreadCount = createAsyncThunk(
  'chat/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/chat/unread-count');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch unread count');
    }
  }
);

const initialState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  unreadCounts: {
    customerUnread: 0,
    sellerUnread: 0,
    totalUnread: 0
  },
  loading: false,
  sending: false,
  error: null
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
    },
    clearActiveConversation: (state) => {
      state.activeConversation = null;
      state.messages = [];
    },
    addLocalMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    clearChatError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Start Chat
      .addCase(startChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startChat.fulfilled, (state, action) => {
        state.loading = false;
        state.activeConversation = action.payload?.conversation || null;
        state.messages = action.payload?.messages || [];
        state.error = null;
      })
      .addCase(startChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Conversations
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload;
        state.error = null;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Messages
      .addCase(fetchConversationMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversationMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.activeConversation = action.payload?.conversation || state.activeConversation;
        state.messages = action.payload?.messages || [];
        state.error = null;
      })
      .addCase(fetchConversationMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Send Message
      .addCase(sendChatMessage.pending, (state) => {
        state.sending = true;
        state.error = null;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.sending = false;
        const msg = action.payload;
        if (msg) {
          state.messages.push(msg);
          // Update last message in active conversation and list
          if (state.activeConversation) {
            state.activeConversation.lastMessage = {
              text: msg.text,
              sender: msg.sender,
              createdAt: msg.createdAt,
              isRead: false
            };
          }
          const idx = state.conversations.findIndex((c) => c._id === msg.conversationId);
          if (idx !== -1) {
            state.conversations[idx].lastMessage = {
              text: msg.text,
              sender: msg.sender,
              createdAt: msg.createdAt,
              isRead: false
            };
            state.conversations[idx].updatedAt = new Date().toISOString();
          }
        }
        state.error = null;
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload;
      })

      // Unread Counts
      .addCase(fetchChatUnreadCount.fulfilled, (state, action) => {
        if (action.payload) {
          state.unreadCounts = action.payload;
        }
      });
  }
});

export const {
  setActiveConversation,
  clearActiveConversation,
  addLocalMessage,
  clearChatError
} = chatSlice.actions;

export default chatSlice.reducer;
