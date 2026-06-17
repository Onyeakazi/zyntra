import { supabase } from '../lib/supabase';

/**
 * Accepts a pending connection request and sets up a Facebook-style system message
 * in their conversation.
 * 
 * @param {string} userAId - One of the users (e.g. current user)
 * @param {string} userBId - The other user (e.g. target user)
 */
export const acceptConnectionInDB = async (userAId, userBId) => {
  if (!userAId || !userBId) {
    throw new Error("Missing user IDs for connection acceptance");
  }

  // 1. Update status to 'accepted' in connections table (tries both directions)
  const { data: connData, error: connError } = await supabase
    .from("connections")
    .update({ status: "accepted" })
    .or(`and(user_id.eq.${userAId},friend_id.eq.${userBId}),and(user_id.eq.${userBId},friend_id.eq.${userAId})`)
    .select();

  if (connError) {
    console.error("Error updating connection status:", connError.message);
    throw connError;
  }

  let finalConnData = connData;
  if (!connData || connData.length === 0) {
    console.log("[Connection Helper] No connection row updated. Inserting new accepted connection...");
    const { data: newConn, error: insertError } = await supabase
      .from("connections")
      .insert({
        user_id: userAId,
        friend_id: userBId,
        status: "accepted"
      })
      .select();

    if (insertError) {
      console.error("Error inserting connection status:", insertError.message);
      throw insertError;
    }
    finalConnData = newConn;
  }

  // 2. Check if conversation already exists between these users
  let { data: convData, error: convFetchErr } = await supabase
    .from("conversations")
    .select("*")
    .or(`and(user_1.eq.${userAId},user_2.eq.${userBId}),and(user_1.eq.${userBId},user_2.eq.${userAId})`)
    .maybeSingle();

  if (convFetchErr) {
    console.error("Error fetching conversation:", convFetchErr.message);
    throw convFetchErr;
  }

  let conversationId;
  const sysMessageContent = "You are now connected! Say hi to start chatting.";

  if (convData) {
    conversationId = convData.id;
    // Update conversation status to accepted
    const { error: convUpdateErr } = await supabase
      .from("conversations")
      .update({
        status: "accepted",
        last_message: sysMessageContent,
        last_sender_id: "system",
        updated_at: new Date().toISOString()
      })
      .eq("id", conversationId);

    if (convUpdateErr) {
      console.error("Error updating conversation status:", convUpdateErr.message);
    }
  } else {
    // Create new conversation
    const { data: newConv, error: convCreateErr } = await supabase
      .from("conversations")
      .insert({
        user_1: userAId,
        user_2: userBId,
        status: "accepted",
        last_message: sysMessageContent,
        last_sender_id: "system",
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (convCreateErr) {
      console.error("Error creating conversation:", convCreateErr.message);
      throw convCreateErr;
    }
    conversationId = newConv.id;
  }

  // 3. Insert system message
  const { data: insertedMsg, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: "system",
      content: sysMessageContent,
      is_read: false
    })
    .select()
    .single();

  if (msgError) {
    console.error("Error inserting system message:", msgError.message);
  }

  // 4. Send real-time broadcasts
  try {
    // Broadcast message to the chat room
    if (insertedMsg) {
      const chatRoomChannel = supabase.channel(`chat-room-${conversationId}`);
      chatRoomChannel.send({
        type: 'broadcast',
        event: 'message_sent',
        payload: insertedMsg
      });
    }

    // Broadcast new_message to both users' inboxes
    const channelA = supabase.channel(`user-inbox-${userAId}`);
    channelA.send({
      type: 'broadcast',
      event: 'new_message',
      payload: { conversation_id: conversationId }
    });

    const channelB = supabase.channel(`user-inbox-${userBId}`);
    channelB.send({
      type: 'broadcast',
      event: 'new_message',
      payload: { conversation_id: conversationId }
    });
  } catch (broadcastErr) {
    console.error("Error sending connection acceptance broadcasts:", broadcastErr.message);
  }

  return { conversationId, connData: finalConnData };
};
