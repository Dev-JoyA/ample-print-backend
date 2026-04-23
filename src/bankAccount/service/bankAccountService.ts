import mongoose from "mongoose";
import { BankAccount, IBankAccount } from "../model/bankAccountModel.js";

export async function getActiveBankAccount(): Promise<IBankAccount | null> {
  return BankAccount.findOne({ isActive: true }).sort({ updatedAt: -1 }).exec();
}

export async function listBankAccounts(): Promise<IBankAccount[]> {
  return BankAccount.find().sort({ isActive: -1, updatedAt: -1 }).exec();
}

export async function createBankAccount(
  data: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    isActive?: boolean;
  },
  createdBy?: string,
): Promise<IBankAccount> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const activeExists = await BankAccount.exists({ isActive: true }).session(
      session,
    );
    const shouldBeActive = data.isActive || !activeExists;

    if (shouldBeActive) {
      await BankAccount.updateMany(
        { isActive: true },
        { $set: { isActive: false } },
        { session },
      );
    }

    const [created] = await BankAccount.create(
      [
        {
          accountName: data.accountName,
          accountNumber: data.accountNumber,
          bankName: data.bankName,
          isActive: !!shouldBeActive,
          createdBy: createdBy
            ? new mongoose.Types.ObjectId(createdBy)
            : undefined,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return created;
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

export async function setActiveBankAccount(
  bankAccountId: string,
): Promise<IBankAccount> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const target = await BankAccount.findById(bankAccountId).session(session);
    if (!target)
      throw Object.assign(new Error("Bank account not found"), { status: 404 });

    await BankAccount.updateMany(
      { _id: { $ne: target._id }, isActive: true },
      { $set: { isActive: false } },
      { session },
    );

    target.isActive = true;
    await target.save({ session });

    await session.commitTransaction();
    return target;
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

export async function deleteBankAccount(
  bankAccountId: string,
): Promise<{ deletedId: string; newActiveId?: string }> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const toDelete = await BankAccount.findById(bankAccountId).session(session);
    if (!toDelete)
      throw Object.assign(new Error("Bank account not found"), { status: 404 });

    const wasActive = toDelete.isActive;
    await BankAccount.deleteOne({ _id: toDelete._id }).session(session);

    let newActiveId: string | undefined;
    if (wasActive) {
      const next = await BankAccount.findOne({})
        .sort({ updatedAt: -1, createdAt: -1 })
        .session(session);
      if (next) {
        await BankAccount.updateMany(
          { _id: { $ne: next._id }, isActive: true },
          { $set: { isActive: false } },
          { session },
        );
        next.isActive = true;
        await next.save({ session });
        newActiveId = next._id.toString();
      }
    }

    await session.commitTransaction();
    return { deletedId: bankAccountId, newActiveId };
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}
