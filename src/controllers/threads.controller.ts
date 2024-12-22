import { NextFunction, Response } from "express";
import { IRequest } from "../type";

import { getAccountAssociatedWithUser } from "../middleware/getAccountUser";
import { sendSuccessResponse } from "../helpers/sendResponse";
import { HttpStatusCode } from "../helpers/customError";

import {
  getThreadInfoService,
  getThreadService,
  searchThreadService,
  toggleArchiveService,
  toggleStarService,
} from "../services/threads.service";

import {
  getThreadsService,
  threadStatsService,
} from "../services/threads.service";
import { AccountId } from "./../validation/account";
import {
  GetThreads,
  RequireAccountAndThreadId,
  searchThread,
} from "../validation/threads";

export async function getThreadInformation(
  req: IRequest<RequireAccountAndThreadId["params"]>,
  res: Response,
  next: NextFunction
) {
  try {
    const { id: accountId, threadId } = req.params;
    const { id: userId } = req.user!;
    const account = await getAccountAssociatedWithUser({
      accountId,
      userId,
    });
    const info = await getThreadInfoService(account, threadId);
    sendSuccessResponse(res, info, HttpStatusCode.OK);
  } catch (e) {
    next(e);
  }
}

export async function getThreadController(
  req: IRequest<RequireAccountAndThreadId["params"]>,
  res: Response,
  next: NextFunction
) {
  try {
    const { id: accountId, threadId } = req.params;
    const { id: userId } = req.user!;
    const account = await getAccountAssociatedWithUser({
      accountId,
      userId,
    });
    const thread = await getThreadService(account.id, threadId);

    sendSuccessResponse(res, thread, HttpStatusCode.OK);
  } catch (e) {
    next(e);
  }
}

export async function toggleStarController(
  req: IRequest<RequireAccountAndThreadId["params"]>,
  res: Response,
  next: NextFunction
) {
  const { id: accountId, threadId } = req.params;
  const { id: userId } = req.user!;
  try {
    const account = await getAccountAssociatedWithUser({
      accountId,
      userId,
    });

    const thread = await toggleStarService(threadId);

    sendSuccessResponse(
      res,
      {
        starred: thread.starred,
      },
      HttpStatusCode.OK
    );
  } catch (e) {
    throw e;
  }
}

export async function toggleArchiveController(
  req: IRequest<RequireAccountAndThreadId["params"]>,
  res: Response,
  next: NextFunction
) {
  const { id: accountId, threadId } = req.params;
  const { id: userId } = req.user!;
  try {
    const account = await getAccountAssociatedWithUser({
      accountId,
      userId,
    });

    const thread = await toggleArchiveService(threadId);

    sendSuccessResponse(
      res,
      {
        archived: thread.archived,
      },
      HttpStatusCode.OK
    );
  } catch (e) {
    throw e;
  }
}

export async function searchThreadsController(
  req: IRequest<
    searchThread["params"],
    unknown,
    unknown,
    searchThread["query"]
  >,
  res: Response,
  next: NextFunction
) {
  try {
    const { id: accountId } = req.params;

    const { id: userId } = req.user!;
    const { query } = req.query;

    const account = await getAccountAssociatedWithUser({
      userId,
      accountId,
    });

    const results = await searchThreadService(account.id, query);

    sendSuccessResponse(res, results, HttpStatusCode.CREATED);
  } catch (e) {
    next(e);
  }
}

export async function threadStatsController(
  req: IRequest<AccountId>,
  res: Response,
  next: NextFunction
) {
  try {
    const { id: accountId } = req.params;
    const { id: userId } = req.user!;
    await getAccountAssociatedWithUser({
      accountId,
      userId,
    });

    const stats = await threadStatsService(accountId);

    sendSuccessResponse(
      res,
      {
        draft: stats[0],
        inbox: stats[1],
        sent: stats[2],
        starred: stats[3],
      },
      HttpStatusCode.OK
    );
  } catch (e) {
    next(e);
  }
}

export async function getThreadsController(
  req: IRequest<GetThreads["params"], unknown, unknown, GetThreads["query"]>,
  res: Response,
  next: NextFunction
) {
  // filter by inbox, draft, sent
  // filter by done
  try {
    const { id: accountId } = req.params;
    const {
      tab = "inbox",
      isDone = "inbox",
      offset = 10,
      page = 0,
    } = req.query;
    const { id: userId } = req.user!;

    await getAccountAssociatedWithUser({
      userId,
      accountId,
    });

    const { sentThreads, totalCount, totalPages } = await getThreadsService(
      accountId,
      tab,
      isDone,
      +offset,
      +page
    );

    const response = {
      data: sentThreads,
      meta: {
        currentPage: page,
        totalPages,
        totalCount,
      },
    };
    sendSuccessResponse(
      res,
      response,

      HttpStatusCode.OK
    );
  } catch (e) {
    next(e);
  }
}
