import type { IMessage, IRoom, IRoomNativeFederated, IUser } from '@rocket.chat/core-typings';
import type { ITraceInstanceMethodsOptions } from '@rocket.chat/tracing';

/**
 * Attribute extractors for FederationMatrix service methods.
 * These extract relevant debugging info from method arguments to add to trace spans.
 */
export const federationAttributeExtractors: ITraceInstanceMethodsOptions['attributeExtractors'] = {
	// Room operations
	createRoom: (args) => {
		const [room, owner] = args as [IRoom, IUser];
		return {
			roomId: room?._id,
			roomName: room?.name || room?.fname,
			roomType: room?.t,
			ownerId: owner?._id,
			ownerUsername: owner?.username,
		};
	},

	createDirectMessageRoom: (args) => {
		const [room, members, creatorId] = args as [IRoom, IUser[], IUser['_id']];
		return {
			roomId: room?._id,
			memberCount: members?.length,
			creatorId,
		};
	},

	// Message operations
	sendMessage: (args) => {
		const [message, room, user] = args as [IMessage, IRoomNativeFederated, IUser];
		return {
			messageId: message?._id,
			roomId: room?._id,
			matrixRoomId: room?.federation?.mrid,
			userId: user?._id,
			username: user?.username,
			hasFiles: Boolean(message?.files?.length),
			hasThread: Boolean(message?.tmid),
			hasAttachments: Boolean(message?.attachments?.length),
		};
	},

	deleteMessage: (args) => {
		const [matrixRoomId, message] = args as [string, IMessage];
		return {
			matrixRoomId,
			messageId: message?._id,
			federationEventId: message?.federation?.eventId,
		};
	},

	updateMessage: (args) => {
		const [room, message] = args as [IRoomNativeFederated, IMessage];
		return {
			roomId: room?._id,
			matrixRoomId: room?.federation?.mrid,
			messageId: message?._id,
			federationEventId: message?.federation?.eventId,
		};
	},

	// Invitation operations
	inviteUsersToRoom: (args) => {
		const [room, matrixUsersUsername, inviter] = args as [IRoomNativeFederated, string[], IUser];
		return {
			roomId: room?._id,
			matrixRoomId: room?.federation?.mrid,
			inviteeCount: matrixUsersUsername?.length,
			inviterUsername: inviter?.username,
		};
	},

	handleInvite: (args) => {
		const [roomId, userId, action] = args as [IRoom['_id'], IUser['_id'], 'accept' | 'reject'];
		return {
			roomId,
			userId,
			action,
		};
	},

	// Reaction operations
	sendReaction: (args) => {
		const [messageId, reaction, user] = args as [string, string, IUser];
		return {
			messageId,
			reaction,
			username: user?.username,
		};
	},

	removeReaction: (args) => {
		const [messageId, reaction, user] = args as [string, string, IUser, IMessage];
		return {
			messageId,
			reaction,
			username: user?.username,
		};
	},

	// Room membership operations
	leaveRoom: (args) => {
		const [roomId, user, kicker] = args as [string, IUser, IUser | undefined];
		return {
			roomId,
			username: user?.username,
			hasKicker: Boolean(kicker),
			kickerUsername: kicker?.username,
		};
	},

	kickUser: (args) => {
		const [room, removedUser, userWhoRemoved] = args as [IRoomNativeFederated, IUser, IUser];
		return {
			roomId: room?._id,
			matrixRoomId: room?.federation?.mrid,
			removedUsername: removedUser?.username,
			kickerUsername: userWhoRemoved?.username,
		};
	},

	// Room settings operations
	updateRoomName: (args) => {
		const [rid, displayName, user] = args as [string, string, IUser];
		return {
			roomId: rid,
			newName: displayName,
			username: user?.username,
		};
	},

	updateRoomTopic: (args) => {
		const [room, topic, user] = args as [IRoomNativeFederated, string, Pick<IUser, '_id' | 'username'>];
		return {
			roomId: room?._id,
			matrixRoomId: room?.federation?.mrid,
			topic,
			username: user?.username,
		};
	},

	// Role operations
	addUserRoleRoomScoped: (args) => {
		const [room, senderId, userId, role] = args as [IRoomNativeFederated, string, string, string];
		return {
			roomId: room?._id,
			matrixRoomId: room?.federation?.mrid,
			senderId,
			targetUserId: userId,
			role,
		};
	},

	// Typing notification
	notifyUserTyping: (args) => {
		const [rid, user, isTyping] = args as [string, string, boolean];
		return {
			roomId: rid,
			username: user,
			isTyping,
		};
	},

	// Verification
	verifyMatrixIds: (args) => {
		const [matrixIds] = args as [string[]];
		return {
			matrixIdCount: matrixIds?.length,
		};
	},

	// User management
	ensureFederatedUsersExistLocally: (args) => {
		const [usernames] = args as [string[]];
		return {
			usernameCount: usernames?.length,
		};
	},

	// Event retrieval
	getEventById: (args) => {
		const [eventId] = args as [string];
		return {
			eventId,
		};
	},
};
