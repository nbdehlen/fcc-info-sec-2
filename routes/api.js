"use strict"
const { Router } = require("express")
const Thread = require("../db/schema/thread")
const router = Router()

const createThread = async (req, res) => {
  const board = req.body.board || req.params.board
  const { text, delete_password } = req.body
  try {
    if (board && text && text.length > 0 && delete_password) {
      const thread = await Thread.create({
        board: req.params.board,
        text: req.body.text,
        delete_password: req.body.delete_password,
        created_on: new Date(),
        bumped_on: new Date(),
        reported: false,
        replies: [],
      })

      if (thread) {
        return res.redirect(`/b/${board}/${thread._id.toString()}`)
      }
    }
  } catch (e) {
    console.warn(e)
  }
  return res.send("thread_id doesn't exist")
}

router.post("/api/threads/:board", createThread)

const deleteThread = async (req, res) => {
  const { board } = req.params
  const { thread_id, delete_password } = req.body

  if (
    typeof board === "string" &&
    board.length > 0 &&
    thread_id &&
    delete_password
  ) {
    const thread = await Thread.findOneAndDelete({
      _id: thread_id,
      board,
      delete_password,
    })
    if (thread) {
      return res.send("success")
    }
  }
  return res.send("incorrect password")
}
router.delete("/api/threads/:board", deleteThread)

/**
 * GET: /api/threads/{board}
 * array of 10 most recently bumped threads with only the 3 most recent replies for each.
 * reported and delete_password will not be sent
 */
const getThreadsOverview = async (req, res) => {
  const { board } = req.params
  const threads = await Thread.find({ board }, [
    "_id",
    "board",
    "text",
    "created_on",
    "bumped_on",
    "replies",
  ])
    .skip(0)
    .limit(10)
    .sort({ bumped_on: 1 })
    .lean()
    .exec()

  //TODO: Don't be lazy, write the query ;-)
  const threadsSanitized = threads.map(t => {
    const len = t.replies.length
    let replies = t.replies

    if (len > 3) {
      replies.splice(0, len - 3)
    }

    replies = replies.map(reply => {
      delete reply.delete_password
      delete reply.reported
      return reply
    })

    return {
      ...t,
      replies,
    }
  })

  return res.status(200).json(threadsSanitized)
}
router.get("/api/threads/:board", getThreadsOverview)

const reportThread = async (req, res) => {
  const { board } = req.params
  const thread_id = req.body.report_id || req.body.thread_id

  try {
    const thread = await Thread.findOneAndUpdate(
      {
        _id: thread_id,
        board,
        // reported: false
      },
      { $set: { reported: true } },
      { new: true }
    )

    if (thread) {
      return res.status(200).send("reported")
    }
  } catch (e) {
    console.warn(e)
  }
  return res.status(503).send("something went wrong")
}
router.put("/api/threads/:board", reportThread)

/**
 * GET: /api/replies/{board}?thread_id={thread_id}
 * entire thread with all it's replies.
 * reported and delete_password will not be sent
 */
const _getThread = async (threadId, board) => {
  if (threadId) {
    const thread = await Thread.findOne({ _id: threadId, board }, [
      "_id",
      "board",
      "text",
      "created_on",
      "bumped_on",
      "replies",
    ]).lean()

    //TODO: Don't be lazy, write the query ;-)
    if (thread) {
      const len = thread.replies.length
      let replies = thread.replies

      replies = replies.map(reply => {
        delete reply.delete_password
        delete reply.reported
        return reply
      })

      const sanitizedThread = { ...thread, replies }
      return sanitizedThread
    }
  }
  return {}
}

const getThread = async (req, res) => {
  const { board } = req.params
  const { thread_id } = req.query
  const result = await _getThread(thread_id, board)
  if (result) {
    return res.json(result)
  }
  return res.send("thread_id doesn't exist")
}
router.get("/api/replies/:board", getThread)

const createReply = async (req, res) => {
  const { text, delete_password, thread_id } = req.body
  const thread = await Thread.findOneAndUpdate(
    { _id: thread_id },
    {
      bumped_on: new Date(),
      $push: {
        replies: {
          $each: [
            {
              text,
              delete_password,
              thread_id,
              created_on: new Date(),
            },
          ],
          $sort: { created_on: -1 },
        },
      },
    },
    { new: true }
  )

  if (thread) {
    return res.redirect(
      `/b/${thread.board}/${thread._id}?reply_id=${thread.replies[0]._id}`
    )
  }

  return res.send("you goofed it")
}
router.post("/api/replies/:board", createReply)

/**
 * DELETE /api/replies/{board}
 * on success: text of the reply will be changed to [deleted]
 */
const deleteReply = async (req, res) => {
  const { board } = req.params
  const { thread_id, reply_id, delete_password } = req.body

  if (thread_id && delete_password && reply_id) {
    const thread = await Thread.findOneAndUpdate(
      {
        _id: thread_id,
        board,
        replies: {
          $elemMatch: {
            _id: reply_id,
            delete_password,
            text: { $ne: "[deleted]" },
          },
        },
      },
      {
        $set: { "replies.$.text": "[deleted]" },
      }
    )
    if (thread) {
      return res.status(200).send("success")
    }
  }

  return res.send("incorrect password")
}

router.delete("/api/replies/:board", deleteReply)

/**
 * PUT: /api/replies/{board}
 * @param {string} thread_id
 * @param {string} reply_id
 * @returns {string} "reported"
 * onSuccess: the reported value of the reply_id will be changed to true
 */
const reportReply = async (req, res) => {
  const { board } = req.params
  const { thread_id, reply_id } = req.body

  const thread = await Thread.findOneAndUpdate(
    {
      _id: thread_id,
      board,
      replies: {
        $elemMatch: {
          _id: reply_id,
          reported: false,
        },
      },
    },
    {
      $set: { "replies.$.reported": true },
    }
  ).lean()

  if (thread) {
    return res.send("reported")
  }

  return res.send("reply_id doesn't exist")
}

router.put("/api/replies/:board", reportReply)

module.exports = router
