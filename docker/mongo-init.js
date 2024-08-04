db.createUser({
  user: "effect_reader",
  pwd: "effect_reader_secret",
  roles: [
    {
      role: "read",
      db: "effect",
    },
  ],
});

db.createUser({
  user: "effect_writer",
  pwd: "effect_writer_secret",
  roles: [
    {
      role: "readWrite",
      db: "effect",
    },
  ],
});

db.createCollection("todos", {});