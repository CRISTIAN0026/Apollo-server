import pkg from 'mongoose';
const { model, Schema } = pkg;

const messageSchema = new Schema({
    text: String,
    createdAt: String,
    createdBy: String
});

export default model('Message', messageSchema);