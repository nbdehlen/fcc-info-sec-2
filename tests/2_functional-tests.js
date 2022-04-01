const chaiHttp = require("chai-http")
const chai = require("chai")
const assert = chai.assert
const server = require("../server")
const threadUrl = "/api/threads/"
const repliesUrl = "/api/replies/"

const getThreadIdFromRedirect = (thread, board) => {
  const boardUrl = board + "/"
  const redirectUrl = thread.redirects[thread.redirects.length - 1]
  const startPosition = redirectUrl.indexOf(boardUrl) + boardUrl.length
  const threadId = redirectUrl.slice(startPosition, redirectUrl.length)
  return threadId
}

const getReplyIdFromRedirect = thread => {
  const redirectUrl = thread.redirects[thread.redirects.length - 1]
  const queryParam = "?reply_id="
  const startPosition = redirectUrl.indexOf(queryParam) + queryParam.length
  const replyId = redirectUrl.slice(startPosition, redirectUrl.length)
  return replyId
}

chai.use(chaiHttp)

suite("Functional Tests", function () {
  let board = `${Math.random()}`
  const random = Math.random()
  this.timeout(42000)

  test("Creating a new thread: POST request to /api/threads/{board}", async function () {
    this.timeout(8000)
    const newThread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({
        text: "testing text",
        delete_password: "password",
      })

    const thread_id = getThreadIdFromRedirect(newThread, board)

    const getThread = await chai
      .request(server)
      .get(repliesUrl + board)
      .query({ thread_id })
    assert.equal(newThread.statusCode, 200)
    assert.equal(getThread.body.text, "testing text")
  })

  test("Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}", async function () {
    this.timeout(8000)
    const threads = await chai.request(server).get(threadUrl + board)

    assert.equal(threads.statusCode, 200)
    assert.isBelow(threads.body.length, 11)

    threads.body.forEach(thread => {
      assert.isBelow(thread.replies.length, 4)
    })
  })

  test("Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password", async function () {
    this.timeout(8000)
    const thread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({
        text: `yaboi-${random}-temp`,
        delete_password: "PASSWORD",
      })

    const thread_id = getThreadIdFromRedirect(thread, board)
    const deletedThread = await chai
      .request(server)
      .delete(threadUrl + board)
      .send({ thread_id, delete_password: "WRONG_PASSWORD" })

    assert.equal(deletedThread.text, "incorrect password")
  })

  test("Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password", async function () {
    this.timeout(8000)
    const thread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({
        text: `yaboi-${random}-temp`,
        delete_password: "PASSWORD",
      })
    const thread_id = getThreadIdFromRedirect(thread, board)

    const deletedThread = await chai
      .request(server)
      .delete(threadUrl + board)
      .send({ thread_id, delete_password: "PASSWORD" })

    assert.equal(deletedThread.text, "success")
  })

  test("Reporting a thread: PUT request to /api/threads/{board}", async function () {
    this.timeout(8000)
    const newThread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({
        text: `yaboi-${random}`,
        delete_password: "password",
      })

    const thread_id = getThreadIdFromRedirect(newThread, board)

    const thread = await chai
      .request(server)
      .put(threadUrl + board)
      .send({ thread_id })

    assert.equal(thread.statusCode, 200)
    assert.equal(thread.res.text, "reported")
  })

  test("Creating a new reply: POST request to /api/replies/{board}", async function () {
    this.timeout(8000)
    const text = `yaboifsddfsfsdfd${Math.random()}`
    const board = `${Math.random()}`
    const newThread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({ text, delete_password: "password" })

    const thread_id = getThreadIdFromRedirect(newThread, board)

    const reply = await chai
      .request(server)
      .post(repliesUrl + board)
      .send({
        thread_id,
        delete_password: "password",
        text: "this is a reply",
      })

    const thread = await chai
      .request(server)
      .get(repliesUrl + board)
      .query({ thread_id })

    const reply_id = getReplyIdFromRedirect(reply)
    const replies = thread.body.replies.filter(reply => reply._id === reply_id)

    assert.equal(reply.statusCode, 200)
    assert.equal(replies.length, 1)
  })

  test("Viewing a single thread with all replies: GET request to /api/replies/{board}", async function () {
    this.timeout(8000)
    const text = `yaboifsddfsfsdfd${Math.random()}`
    const newThread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({ text, delete_password: "password" })

    const thread_id = getThreadIdFromRedirect(newThread, board)

    await chai
      .request(server)
      .post(repliesUrl + board)
      .send({
        thread_id,
        delete_password: "password",
        text: "this is a reply",
      })

    await chai
      .request(server)
      .post(repliesUrl + board)
      .send({
        thread_id,
        delete_password: "password",
        text: "this is a another reply",
      })

    const replies = await chai
      .request(server)
      .get(repliesUrl + board)
      .query({
        thread_id,
      })

    assert.isAbove(replies.body.replies.length, 1)
    assert.equal(replies.statusCode, 200)
  })

  test("Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password", async function () {
    this.timeout(8000)
    const newThread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({ text: "yalla", delete_password: "password" })

    const thread_id = getThreadIdFromRedirect(newThread, board)

    const createReply = await chai
      .request(server)
      .post(repliesUrl + board)
      .send({
        thread_id,
        delete_password: "password",
        text: "this is a reply",
      })

    const reply_id = getReplyIdFromRedirect(createReply)

    const replies = await chai
      .request(server)
      .delete(repliesUrl + board)
      .send({
        thread_id,
        reply_id,
        delete_password: "wrong_password",
      })

    assert.equal(replies.text, "incorrect password")
  })

  test("Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password", async function () {
    this.timeout(8000)
    const newThread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({ text: "yalla", delete_password: "password" })

    const thread_id = getThreadIdFromRedirect(newThread, board)

    const createReply = await chai
      .request(server)
      .post(repliesUrl + board)
      .send({
        thread_id,
        delete_password: "pasiasdsaasdsword",
        text: "thiadssssssdss is a reply",
      })

    const reply_id = getReplyIdFromRedirect(createReply)

    const deleteReply = await chai
      .request(server)
      .delete(repliesUrl + board)
      .send({
        thread_id,
        reply_id,
        delete_password: "pasiasdsaasdsword",
      })

    assert.equal(deleteReply.text, "success")
  })

  test("Reporting a reply: PUT request to /api/replies/{board}", async function () {
    this.timeout(8000)
    const random = Math.random()
    const newThread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({
        text: `fafaaaaaaaa${random}`,
        delete_password: "password",
      })

    const thread_id = getThreadIdFromRedirect(newThread, board)

    const createReply = await chai
      .request(server)
      .post(repliesUrl + board)
      .send({
        thread_id,
        delete_password: "password",
        text: "I will be reporting myself",
      })

    const reply_id = getReplyIdFromRedirect(createReply)

    const reported = await chai
      .request(server)
      .put(repliesUrl + board)
      .send({
        thread_id,
        reply_id,
      })

    assert.equal(reported.text, "reported")
  })
})
