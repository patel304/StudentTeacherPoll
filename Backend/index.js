import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { randomUUID } from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true }));
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
	cors: {
		origin: true,
		methods: ["GET", "POST"],
	},
});

// In-memory stores
const socketIdToUsername = new Map();
const usernameToSocketIds = new Map();

const pollsById = new Map();
const pollsByTeacher = new Map();

// Helpers
function emitParticipantsUpdate() {
	const participants = Array.from(usernameToSocketIds.keys());
	io.emit("participantsUpdate", participants);
}

function createTeacherUsername() {
	const suffix = Math.random().toString(36).slice(2, 8);
	return `teacher_${suffix}`;
}

// REST endpoints
app.get("/health", (_req, res) => {
	res.json({ ok: true });
});

app.post("/teacher-login", (_req, res) => {
	const username = createTeacherUsername();
	res.json({ username });
});

app.get("/polls/:username", (req, res) => {
	const username = req.params.username;
	const polls = pollsByTeacher.get(username) || [];
	const response = polls.map((poll) => ({
		_id: poll._id,
		question: poll.question,
		options: poll.options.map((opt) => ({
			_id: opt._id,
			text: opt.text,
			votes: opt.votes || 0,
		})),
	}));
	res.json({ data: response });
});

// Socket.IO events
io.on("connection", (socket) => {
	// Join chat and track participants
	socket.on("joinChat", (payload) => {
		const username = payload && payload.username ? String(payload.username) : null;
		if (!username) return;

		socketIdToUsername.set(socket.id, username);
		if (!usernameToSocketIds.has(username)) {
			usernameToSocketIds.set(username, new Set());
		}
		usernameToSocketIds.get(username).add(socket.id);

		emitParticipantsUpdate();
	});

	// Broadcast chat messages
	socket.on("chatMessage", (message) => {
		io.emit("chatMessage", message);
	});

	// Teacher can kick out a participant by username
	socket.on("kickOut", (participantUsername) => {
		const username = String(participantUsername || "");
		if (!username) return;
		const socketIds = usernameToSocketIds.get(username);
		if (!socketIds) return;

		for (const sid of socketIds) {
			io.to(sid).emit("kickedOut");
			const s = io.sockets.sockets.get(sid);
			if (s) {
				try {
					s.disconnect(true);
				} catch {}
			}
		}
	});

	// Create a new poll
	socket.on("createPoll", (pollData) => {
		try {
			const teacherUsername = String(pollData.teacherUsername || "");
			const question = String(pollData.question || "").slice(0, 200);
			const timer = Number(pollData.timer) || 60;
			const rawOptions = Array.isArray(pollData.options) ? pollData.options : [];

			const pollId = randomUUID();
			const options = rawOptions.map((opt, index) => ({
				_id: randomUUID(),
				id: opt && typeof opt.id !== "undefined" ? opt.id : index + 1,
				text: String(opt && opt.text ? opt.text : "Option").slice(0, 200),
				correct: Boolean(opt && typeof opt.correct !== "undefined" ? opt.correct : false),
				votes: 0,
			}));

			const votesByOptionText = {};
			for (const opt of options) {
				votesByOptionText[opt.text] = 0;
			}

			const poll = {
				_id: pollId,
				question,
				timer,
				teacherUsername,
				options,
				votesByOptionText,
				voters: new Set(),
			};

			pollsById.set(pollId, poll);
			if (!pollsByTeacher.has(teacherUsername)) {
				pollsByTeacher.set(teacherUsername, []);
			}
			pollsByTeacher.get(teacherUsername).push(poll);

			io.emit("pollCreated", {
				_id: poll._id,
				question: poll.question,
				options: poll.options.map((o) => ({ id: o.id, text: o.text, correct: o.correct })),
				timer: poll.timer,
			});
		} catch (err) {
			console.error("Error creating poll:", err);
		}
	});

	// Submit an answer
	socket.on("submitAnswer", (payload) => {
		try {
			const username = String(payload && payload.username ? payload.username : "");
			const selectedOptionText = String(payload && payload.option ? payload.option : "");
			const pollId = String(payload && payload.pollId ? payload.pollId : "");

			if (!username || !selectedOptionText || !pollId) return;
			const poll = pollsById.get(pollId);
			if (!poll) return;
			if (poll.voters.has(username)) {
				io.emit("pollResults", { ...poll.votesByOptionText });
				return;
			}

			const option = poll.options.find((o) => o.text === selectedOptionText);
			if (!option) return;

			poll.voters.add(username);
			poll.votesByOptionText[selectedOptionText] = (poll.votesByOptionText[selectedOptionText] || 0) + 1;
			option.votes = (option.votes || 0) + 1;

			io.emit("pollResults", { ...poll.votesByOptionText });
		} catch (err) {
			console.error("Error submitting answer:", err);
		}
	});

	socket.on("disconnect", () => {
		const username = socketIdToUsername.get(socket.id);
		if (username) {
			socketIdToUsername.delete(socket.id);
			const ids = usernameToSocketIds.get(username);
			if (ids) {
				ids.delete(socket.id);
				if (ids.size === 0) usernameToSocketIds.delete(username);
			}
		}
		emitParticipantsUpdate();
	});
});

httpServer.listen(PORT, () => {
	console.log(`server is running on http://localhost:${PORT}`);
});