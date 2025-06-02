import mongoose from 'mongoose';

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  time: {
    type: Date,
    required: true
  },
  audioPath: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
chatHistorySchema.index({ userId: 1, time: -1 });

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

export default ChatHistory; 