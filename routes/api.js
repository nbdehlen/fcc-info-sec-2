"use strict"
const { Router } = require("express")
const Thread = require("../db/schema/thread")
const router = Router()

const createThread = async (req, res) => {
  try {
    const thread = await Thread.create({
      board: req.params.board,
      text: req.body.text,
      delete_password: req.body.delete_password,
    })

    return res.status(201).json(thread)
  } catch (e) {}
}

router.post("/api/threads/:board", createThread)

const deleteThread = async (req, res) => {
  const { thread_id, delete_password } = req.body

  if (thread_id && delete_password) {
    const threadExists = await Thread.findOne({ _id: thread_id })

    if (threadExists.delete_password === delete_password) {
      return res.send("success")
    }
    return res.send("incorrect password")
  }
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
  const thread_id = req.body.thread_id
  try {
    const thread = await Thread.findOneAndUpdate(
      { _id: thread_id },
      { reported: true },
      { new: true }
    )

    if (thread.reported) {
      return res.status(200).send("reported")
    }
  } catch (e) {
    console.warn(e)
  }
}
router.put("/api/threads/:board", reportThread)

/**
 * GET: /api/replies/{board}?thread_id={thread_id}
 * entire thread with all it's replies.
 * reported and delete_password will not be sent
 */
const getThread = async (req, res) => {
  const { thread_id } = req.query
  if (thread_id) {
    const thread = await Thread.findOne({ _id: thread_id }, [
      "_id",
      "board",
      "text",
      "created_on",
      "bumped_on",
      "replies",
    ]).lean()

    //TODO: Don't be lazy, write the query ;-)
    const len = thread.replies.length
    let replies = thread.replies

    if (len > 3) {
      replies.splice(0, len - 3)
    }

    replies = replies.map(reply => {
      delete reply.delete_password
      delete reply.reported
      return reply
    })

    const sanitizedThread = { ...thread, replies }

    return res.status(200).json(sanitizedThread)
  } else {
    return res.send("thread_id doesn't exist")
  }
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
          text,
          delete_password,
          thread_id,
        },
      },
    },
    { new: true }
  )
  return res.status(201).json(thread)
}
router.post("/api/replies/:board", createReply)

/**
 * DELETE /api/replies/{board}
 * on success: text of the reply will be changed to [deleted]
 */
const deleteReply = async (req, res) => {
  const { thread_id, reply_id, delete_password } = req.body
  if (thread_id && delete_password) {
    // TODO: Don't be lazy, write the query ;-)
    const thread = await Thread.findOne({ _id: thread_id }).lean()
    const replyExists = thread.replies.filter(
      reply => reply._id.toString() === reply_id
    )
    if (
      replyExists.length > 0 &&
      replyExists[0].delete_password === delete_password
    ) {
      const replies = thread.replies.map(reply => ({
        ...reply,
        text: reply._id.toString() === reply_id ? "[deleted]" : reply.text,
      }))
      await Thread.findOneAndUpdate(
        { _id: thread_id },
        { replies },
        { new: true }
      )
      return res.send("success")
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
  const { thread_id, reply_id } = req.body
  const thread = await Thread.findOne({ _id: thread_id }).lean()

  const replies = thread.replies.map(reply => ({
    ...reply,
    reported: reply._id.toString() === reply_id,
  }))

  if (replies.length > 0) {
    const updatedThread = await Thread.findOneAndUpdate(
      { _id: thread_id },
      { $set: { replies } },
      { new: true }
    )

    return res.send("reported")
  }

  return res.send("reply_id doesn't exist")
}

router.put("/api/replies/:board", reportReply)

module.exports = router
