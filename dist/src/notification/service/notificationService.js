import mongoose, { Types } from "mongoose";
import { Notification } from "../models/notificationModel.js";
import { User, UserRole } from "../../users/model/userModel.js";
export const notificationService = {
    getUserNotifications: async (userId, filters = {}) => {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        const query = { userId: new Types.ObjectId(userId.toString()) };
        if (filters.read !== undefined) {
            query.read = filters.read;
        }
        if (filters.type) {
            query.type = filters.type;
        }
        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Notification.countDocuments(query)
        ]);
        const formattedNotifications = notifications.map(n => ({
            id: n._id.toString(),
            type: n.type,
            title: n.title,
            message: n.message,
            data: n.data,
            timestamp: n.createdAt,
            read: n.read,
            link: n.link
        }));
        return {
            notifications: formattedNotifications,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };
    },
    resolveRecipients: async (recipients) => {
        let userIds = [];
        if (typeof recipients === 'string') {
            userIds = [recipients];
        }
        else if (recipients instanceof Types.ObjectId) {
            userIds = [recipients.toString()];
        }
        else if (Array.isArray(recipients)) {
            userIds = recipients.map(id => id.toString());
        }
        else if ('userId' in recipients) {
            userIds = [recipients.userId.toString()];
        }
        else if ('customer' in recipients || 'notifyAdmins' in recipients || 'notifySuperAdmins' in recipients) {
            const { customer, notifyAdmins, notifySuperAdmins, specificAdmins, excludeUserId } = recipients;
            if (customer) {
                userIds.push(customer.toString());
            }
            if (specificAdmins && specificAdmins.length > 0) {
                userIds.push(...specificAdmins.map(id => id.toString()));
            }
            if (notifyAdmins) {
                const admins = await User.find({
                    role: UserRole.Admin,
                    isActive: true
                }).select('_id').lean();
                userIds.push(...admins.map(a => a._id.toString()));
            }
            if (notifySuperAdmins) {
                const superAdmins = await User.find({
                    role: UserRole.SuperAdmin,
                    isActive: true
                }).select('_id').lean();
                userIds.push(...superAdmins.map(sa => sa._id.toString()));
            }
            if (excludeUserId) {
                userIds = userIds.filter(id => id !== excludeUserId.toString());
            }
        }
        return [...new Set(userIds)];
    },
    createNotification: async (recipients, data) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const userIds = await notificationService.resolveRecipients(recipients);
            if (userIds.length === 0) {
                console.log('No recipients found for notification');
                await session.commitTransaction();
                session.endSession();
                return [];
            }
            const notifications = await Promise.all(userIds.map(async (userId) => {
                const [notification] = await Notification.create([{
                        userId: new Types.ObjectId(userId.toString()),
                        type: data.type,
                        title: data.title,
                        message: data.message,
                        data: data.data || {},
                        link: data.link,
                        read: false,
                        createdAt: new Date()
                    }], { session });
                return notification;
            }));
            await session.commitTransaction();
            session.endSession();
            return notifications.map(n => ({
                id: n._id.toString(),
                type: n.type,
                title: n.title,
                message: n.message,
                data: n.data,
                timestamp: n.createdAt,
                read: n.read,
                link: n.link
            }));
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error('Error creating notifications:', error);
            throw error;
        }
    },
    createForUser: async (userId, data) => {
        const notifications = await notificationService.createNotification(userId, data);
        return notifications[0] || null;
    },
    createForAdmins: async (data, excludeUserId) => {
        return await notificationService.createNotification({ notifyAdmins: true, notifySuperAdmins: true, excludeUserId }, data);
    },
    createForSuperAdmins: async (data, excludeUserId) => {
        return await notificationService.createNotification({ notifySuperAdmins: true, excludeUserId }, data);
    },
    createForCustomerAndAdmins: async (customerId, data, notifyAdmins = true) => {
        return await notificationService.createNotification({ customer: customerId, notifyAdmins, notifySuperAdmins: notifyAdmins }, data);
    },
    markAsRead: async (notificationId, userId) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const notification = await Notification.findOneAndUpdate({
                _id: new Types.ObjectId(notificationId.toString()),
                userId: new Types.ObjectId(userId.toString())
            }, {
                read: true,
                readAt: new Date()
            }, { new: true, session }).lean();
            if (!notification) {
                await session.commitTransaction();
                session.endSession();
                return null;
            }
            await session.commitTransaction();
            session.endSession();
            return {
                id: notification._id.toString(),
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                timestamp: notification.createdAt,
                read: notification.read,
                link: notification.link
            };
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    },
    markAllAsRead: async (userId) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            await Notification.updateMany({
                userId: new Types.ObjectId(userId.toString()),
                read: false
            }, {
                read: true,
                readAt: new Date()
            }, { session });
            await session.commitTransaction();
            session.endSession();
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    },
    deleteNotification: async (notificationId, userId) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const result = await Notification.deleteOne({
                _id: new Types.ObjectId(notificationId.toString()),
                userId: new Types.ObjectId(userId.toString())
            }).session(session);
            await session.commitTransaction();
            session.endSession();
            return result.deletedCount > 0;
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    },
    getUnreadCount: async (userId) => {
        return await Notification.countDocuments({
            userId: new Types.ObjectId(userId.toString()),
            read: false
        });
    },
    deleteAllUserNotifications: async (userId) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            await Notification.deleteMany({
                userId: new Types.ObjectId(userId.toString())
            }).session(session);
            await session.commitTransaction();
            session.endSession();
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }
};
//# sourceMappingURL=notificationService.js.map