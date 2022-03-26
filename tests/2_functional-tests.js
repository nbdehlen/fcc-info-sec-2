const chaiHttp = require("chai-http")
const chai = require("chai")
const assert = chai.assert
const server = require("../server")
const threadUrl = "/api/threads/"
const repliesUrl = "/api/replies/"

chai.use(chaiHttp)

suite("Functional Tests", function () {
  let board = "freecodecamporg"
  const random = Math.random()
  this.timeout(12000)

  test("Creating a new thread: POST request to /api/threads/{board}", async function () {
    const newThread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({ text: `yaboi-${random}`, delete_password: "password" })

    assert.equal(newThread.statusCode, 201)
    assert.equal(newThread.body.delete_password, "password")
  })

  test("Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}", async function () {
    const threads = await chai.request(server).get(threadUrl + board)

    assert.equal(threads.statusCode, 200)
    assert.isBelow(threads.body.length, 11)

    threads.body.forEach(thread => {
      assert.isBelow(thread.replies.length, 4)
    })
  })

  test("Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password", async function () {
    const thread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({ text: `yaboi-${random}-temp`, delete_password: "PASSWORD" })

    const deletedThread = await chai
      .request(server)
      .delete(threadUrl + board)
      .send({ thread_id: thread.body._id, delete_password: "WRONG_PASSWORD" })

    assert.equal(deletedThread.text, "incorrect password")
  })

  test("Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password", async function () {
    const thread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({ text: `yaboi-${random}-temp`, delete_password: "PASSWORD" })

    const deletedThread = await chai
      .request(server)
      .delete(threadUrl + board)
      .send({ thread_id: thread.body._id, delete_password: "PASSWORD" })

    assert.equal(deletedThread.text, "success")
  })

  test("Reporting a thread: PUT request to /api/threads/{board}", async function () {
    const newThread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({ text: `yaboi-${random}`, delete_password: "password" })

    const thread = await chai
      .request(server)
      .put(threadUrl + board)
      .send({ thread_id: newThread.body._id })

    assert.equal(thread.statusCode, 200)
  })

  test("Creating a new reply: POST request to /api/replies/{board}", async function () {
    const text = `yaboifsddfsfsdfd${Math.random()}`
    const newThread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({ text, delete_password: "password" })

    const reply = await chai
      .request(server)
      .post(threadUrl + board)
      .send({
        thread_id: newThread.body._id,
        delete_password: "password",
        text: "this is a reply",
      })

    assert.equal(reply.statusCode, 201)
  })

  test("Viewing a single thread with all replies: GET request to /api/replies/{board}", async function () {
    const text = `yaboifsddfsfsdfd${Math.random()}`
    const newThread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({ text, delete_password: "password" })

    await chai
      .request(server)
      .post(repliesUrl + board)
      .send({
        thread_id: newThread.body._id,
        delete_password: "password",
        text: "this is a reply",
      })

    await chai
      .request(server)
      .post(repliesUrl + board)
      .send({
        thread_id: newThread.body._id,
        delete_password: "password",
        text: "this is a another reply",
      })

    const replies = await chai
      .request(server)
      .get(repliesUrl + board)
      .query({
        thread_id: newThread.body._id,
      })

    assert.isAbove(replies.body.replies.length, 1)
    assert.equal(replies.statusCode, 200)
  })

  test("Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password", async function () {
    const newThread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({ text: "yalla", delete_password: "password" })

    const reply = await chai
      .request(server)
      .post(repliesUrl + board)
      .send({
        thread_id: newThread.body._id,
        delete_password: "password",
        text: "this is a reply",
      })

    const replies = await chai
      .request(server)
      .delete(repliesUrl + board)
      .send({
        thread_id: newThread.body._id,
        reply_id: reply.body._id,
        delete_password: "wrong_password",
      })

    assert.equal(replies.text, "incorrect password")
  })

  test("Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password", async function () {
    const newThread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({ text: "yalla", delete_password: "password" })

    const createReply = await chai
      .request(server)
      .post(repliesUrl + board)
      .send({
        thread_id: newThread.body._id,
        delete_password: "pasiasdsaasdsword",
        text: "thiadssssssdss is a reply",
      })

    const replies = await chai
      .request(server)
      .get(repliesUrl + board)
      .query({ thread_id: newThread.body._id })

    const deleteReply = await chai
      .request(server)
      .delete(repliesUrl + board)
      .send({
        thread_id: newThread.body._id,
        reply_id: replies.body.replies[replies.body.replies.length - 1]._id,
        delete_password:
          createReply.body.replies[createReply.body.replies.length - 1]
            .delete_password,
      })

    assert.equal(deleteReply.text, "success")
  })

  test("Reporting a reply: PUT request to /api/replies/{board}", async function () {
    const random = Math.random()
    const newThread = await chai
      .request(server)
      .post(threadUrl + board)
      .send({ text: `fafaaaaaaaa${random}`, delete_password: "password" })

    const reply = await chai
      .request(server)
      .post(repliesUrl + board)
      .send({
        thread_id: newThread.body._id,
        delete_password: "password",
        text: "I will be reporting myself",
      })

    const reported = await chai
      .request(server)
      .put(repliesUrl + board)
      .send({
        thread_id: newThread.body._id,
        reply_id: reply.body.replies[0]._id,
      })
    assert.equal(reported.text, "reported")
  })
})
