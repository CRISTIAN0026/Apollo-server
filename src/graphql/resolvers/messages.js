import Message from '../../models/Message.js';
const { findById } = Message

const Mutation = {
    async createMessage(_, { messageInput: { text, username } }) {
        const newMessage = new Message({
            text: text,
            createdBy: username,
            createdAt: new Date().toISOString()
        });

        const res = await newMessage.save();
        console.log(res);
        return {
            id: res.id,
            ...res._doc
        };
    }
};
const Query = {
    message: (_, { ID }) => findById(ID)
};

export {
    Query,
    Mutation
  };