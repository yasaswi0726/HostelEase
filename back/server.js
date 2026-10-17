
const express = require("express");
const cors = require("cors");
const db = require("./config/db");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Home
// GET Dashboard statistics
app.get("/api/dashboard", (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM students) AS total_students,
      (SELECT COUNT(*) FROM rooms) AS total_rooms,
      (SELECT COALESCE(SUM(capacity), 0) FROM rooms) AS total_beds,
      (SELECT COALESCE(SUM(occupied), 0) FROM rooms) AS occupied_beds,
      (SELECT COALESCE(SUM(capacity - occupied), 0) FROM rooms) AS available_beds
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Could not load dashboard statistics",
        error: err.message
      });
    }

    res.json(results[0]);
  });
});
app.get("/", (req, res) => {
  res.send("Hostel Management Backend is working!");
});

// GET all rooms
app.get("/api/rooms", (req, res) => {
  db.query("SELECT * FROM rooms", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// POST - Add a room

app.post("/api/rooms", (req, res) => {
  let { room_number, floor, capacity } = req.body;

  // 1. Validate room number
  if (
    typeof room_number !== "string" ||
    !room_number.trim()
  ) {
    return res.status(400).json({
      message: "Room number is required."
    });
  }

  room_number = room_number.trim();

  if (room_number.length > 20) {
    return res.status(400).json({
      message: "Room number must not exceed 20 characters."
    });
  }

  // 2. Validate floor number
  if (
    floor !== undefined &&
    floor !== null &&
    floor !== "" &&
    (!Number.isInteger(Number(floor)) || Number(floor) < 0)
  ) {
    return res.status(400).json({
      message: "Floor must be a whole number greater than or equal to 0."
    });
  }

  const validFloor =
    floor === undefined || floor === null || floor === ""
      ? 0
      : Number(floor);

  // 3. Validate bed capacity
  if (
    capacity === undefined ||
    capacity === null ||
    capacity === "" ||
    !Number.isInteger(Number(capacity)) ||
    Number(capacity) < 1 ||
    Number(capacity) > 1000
  ) {
    return res.status(400).json({
      message: "Bed capacity must be a whole number between 1 and 1000."
    });
  }

  const validCapacity = Number(capacity);

  // 4. Insert room into database
  const sql = `
    INSERT INTO rooms (room_number, floor, capacity, occupied)
    VALUES (?, ?, ?, 0)
  `;

  db.query(
    sql,
    [room_number, validFloor, validCapacity],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({
            message: "This room number already exists. Please use another room number."
          });
        }

        console.error("Add room error:", err.message);

        return res.status(500).json({
          message: "Could not add room."
        });
      }

      return res.status(201).json({
        message: "Room added successfully!",
        id: result.insertId
      });
    }
  );
});

// PUT - Update room details

app.put("/api/rooms/:id", (req, res) => {
  let { room_number, floor, capacity } = req.body;
  const roomId = Number(req.params.id);

  // 1. Validate room ID
  if (!Number.isInteger(roomId) || roomId < 1) {
    return res.status(400).json({
      message: "Invalid room ID."
    });
  }

  // 2. Validate room number
  if (
    typeof room_number !== "string" ||
    !room_number.trim()
  ) {
    return res.status(400).json({
      message: "Room number is required."
    });
  }

  room_number = room_number.trim();

  if (room_number.length > 20) {
    return res.status(400).json({
      message: "Room number must not exceed 20 characters."
    });
  }

  // 3. Validate floor
  if (
    floor === undefined ||
    floor === null ||
    floor === "" ||
    !Number.isInteger(Number(floor)) ||
    Number(floor) < 0
  ) {
    return res.status(400).json({
      message: "Floor must be a whole number greater than or equal to 0."
    });
  }

  // 4. Validate capacity
  if (
    capacity === undefined ||
    capacity === null ||
    capacity === "" ||
    !Number.isInteger(Number(capacity)) ||
    Number(capacity) < 1 ||
    Number(capacity) > 1000
  ) {
    return res.status(400).json({
      message: "Capacity must be a whole number between 1 and 1000."
    });
  }

  floor = Number(floor);
  capacity = Number(capacity);

  // 5. Check whether the room exists
  db.query(
    "SELECT occupied FROM rooms WHERE id = ?",
    [roomId],
    (err, results) => {
      if (err) {
        console.error("Find room error:", err.message);
        return res.status(500).json({
          message: "Could not find room."
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          message: "Room not found."
        });
      }

      const occupied = Number(results[0].occupied);

      // 6. Capacity cannot be below occupancy
      if (capacity < occupied) {
        return res.status(400).json({
          message: `Capacity cannot be less than the ${occupied} currently occupied beds.`
        });
      }

      // 7. Update the room
      const sql = `
        UPDATE rooms
        SET room_number = ?, floor = ?, capacity = ?
        WHERE id = ?
      `;

      db.query(
        sql,
        [room_number, floor, capacity, roomId],
        (updateErr) => {
          if (updateErr) {
            if (updateErr.code === "ER_DUP_ENTRY") {
              return res.status(409).json({
                message: "This room number already exists."
              });
            }

            console.error("Update room error:", updateErr.message);

            return res.status(500).json({
              message: "Could not update room."
            });
          }

          return res.json({
            message: "Room updated successfully!"
          });
        }
      );
    }
  );
});


// DELETE - Delete a room only if no students are allocated
app.delete("/api/rooms/:id", (req, res) => {
  const roomId = req.params.id;

  db.query(
    "SELECT COUNT(*) AS total FROM allocations WHERE room_id = ?",
    [roomId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (results[0].total > 0) {
        return res.status(400).json({
          message: "Cannot delete a room with student allocations"
        });
      }

      db.query("DELETE FROM rooms WHERE id = ?", [roomId], (deleteErr, result) => {
        if (deleteErr) {
          return res.status(500).json({ error: deleteErr.message });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Room not found" });
        }

        res.json({ message: "Room deleted successfully!" });
      });
    }
  );
});
// GET all room allocation records
app.get("/api/allocations", (req, res) => {
  const sql = `
    SELECT
      allocations.id AS allocation_id,
      students.student_id,
      students.name AS student_name,
      students.department,
      rooms.room_number,
      rooms.floor,
      allocations.allocation_date
    FROM allocations
    JOIN students ON allocations.student_id = students.id
    JOIN rooms ON allocations.room_id = rooms.id
    ORDER BY allocations.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Could not load allocation records",
        error: err.message
      });
    }

    res.json(results);
  });
});

// POST - Allocate a room to a student

app.post("/api/allocations", (req, res) => {
  let { student_id, room_id } = req.body;

  // 1. Validate Student ID
  if (
    typeof student_id !== "string" ||
    !student_id.trim()
  ) {
    return res.status(400).json({
      message: "A valid Student ID is required."
    });
  }

  student_id = student_id.trim();

  // 2. Validate Room ID
  if (
    room_id === undefined ||
    room_id === null ||
    room_id === "" ||
    !Number.isInteger(Number(room_id)) ||
    Number(room_id) < 1
  ) {
    return res.status(400).json({
      message: "A valid Room ID is required."
    });
  }

  room_id = Number(room_id);

  // 3. Start a database transaction
  db.beginTransaction((transactionErr) => {
    if (transactionErr) {
      console.error("Transaction error:", transactionErr.message);
      return res.status(500).json({
        message: "Could not start room allocation."
      });
    }

    // Roll back any unsuccessful allocation
    function fail(statusCode, message) {
      db.rollback(() => {
        return res.status(statusCode).json({ message });
      });
    }

    // 4. Find and lock the student record
    db.query(
      "SELECT id FROM students WHERE student_id = ? FOR UPDATE",
      [student_id],
      (studentErr, studentResults) => {
        if (studentErr) {
          console.error(studentErr.message);
          return fail(500, "Could not verify student.");
        }

        if (studentResults.length === 0) {
          return fail(404, "Student not found. Add the student first.");
        }

        const studentDbId = studentResults[0].id;

        // 5. Check whether the student already has a room
        db.query(
          "SELECT id FROM allocations WHERE student_id = ?",
          [studentDbId],
          (allocationErr, allocationResults) => {
            if (allocationErr) {
              console.error(allocationErr.message);
              return fail(500, "Could not check existing allocations.");
            }

            if (allocationResults.length > 0) {
              return fail(
                409,
                "This student already has a room allocated."
              );
            }

            // 6. Find and lock the selected room
            db.query(
              "SELECT id, capacity, occupied FROM rooms WHERE id = ? FOR UPDATE",
              [room_id],
              (roomErr, roomResults) => {
                if (roomErr) {
                  console.error(roomErr.message);
                  return fail(500, "Could not verify room availability.");
                }

                if (roomResults.length === 0) {
                  return fail(404, "Room not found.");
                }

                const room = roomResults[0];
                const capacity = Number(room.capacity);
                const occupied = Number(room.occupied);

                if (occupied >= capacity) {
                  return fail(
                    400,
                    "This room is full. Please select another room."
                  );
                }

                // 7. Save the allocation
                db.query(
                  `INSERT INTO allocations
                   (student_id, room_id, allocation_date)
                   VALUES (?, ?, CURDATE())`,
                  [studentDbId, room_id],
                  (insertErr) => {
                    if (insertErr) {
                      console.error(insertErr.message);

                      if (insertErr.code === "ER_DUP_ENTRY") {
                        return fail(
                          409,
                          "This student already has a room allocated."
                        );
                      }

                      return fail(500, "Could not save room allocation.");
                    }

                    // 8. Increase room occupancy
                    db.query(
                      "UPDATE rooms SET occupied = occupied + 1 WHERE id = ?",
                      [room_id],
                      (updateErr) => {
                        if (updateErr) {
                          console.error(updateErr.message);
                          return fail(
                            500,
                            "Could not update room occupancy."
                          );
                        }

                        // 9. Commit both database changes
                        db.commit((commitErr) => {
                          if (commitErr) {
                            console.error(commitErr.message);

                            return db.rollback(() => {
                              return res.status(500).json({
                                message: "Could not complete room allocation."
                              });
                            });
                          }

                          return res.status(201).json({
                            message: "Room allocated successfully!"
                          });
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// GET all students
app.get("/api/students", (req, res) => {
  db.query("SELECT * FROM students", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// POST - Add a student

app.post("/api/students", (req, res) => {
  let { student_id, name, gender, department, year, phone } = req.body;

  // 1. Check required fields
  if (
    typeof student_id !== "string" ||
    typeof name !== "string" ||
    !student_id.trim() ||
    !name.trim()
  ) {
    return res.status(400).json({
      message: "Student ID and name are required."
    });
  }

  // 2. Clean up text inputs
  student_id = student_id.trim();
  name = name.trim();

  if (typeof department === "string") {
    department = department.trim();
  }

  if (typeof phone === "string") {
    phone = phone.trim();
  }

  // 3. Validate Student ID
  if (student_id.length > 30) {
    return res.status(400).json({
      message: "Student ID must not exceed 30 characters."
    });
  }

  // 4. Validate student name
  if (name.length > 100 || !/^[\p{L}\s.'-]+$/u.test(name)) {
    return res.status(400).json({
      message: "Enter a valid student name (letters only, with spaces or basic punctuation)."
    });
  }

  // 5. Validate gender
  if (
    gender != null &&
    gender !== "" &&
    !["Male", "Female", "Other"].includes(gender)
  ) {
    return res.status(400).json({
      message: "Please select a valid gender."
    });
  }

  // 6. Validate department
  if (
    department != null &&
    department !== "" &&
    (typeof department !== "string" || department.length > 50)
  ) {
    return res.status(400).json({
      message: "Department must not exceed 50 characters."
    });
  }

  // 7. Validate year
  if (
    year != null &&
    year !== "" &&
    (!Number.isInteger(Number(year)) ||
      Number(year) < 1 ||
      Number(year) > 6)
  ) {
    return res.status(400).json({
      message: "Year must be a whole number between 1 and 6."
    });
  }

  // 8. Validate phone number
  if (
    phone != null &&
    phone !== "" &&
    (typeof phone !== "string" || !/^\d{10,15}$/.test(phone))
  ) {
    return res.status(400).json({
      message: "Phone number must contain 10 to 15 digits."
    });
  }

  // 9. Prepare database query
  const sql = `
    INSERT INTO students
    (student_id, name, gender, department, year, phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const values = [
    student_id,
    name,
    gender || null,
    department || null,
    year === "" || year == null ? null : Number(year),
    phone || null
  ];

  // 10. Save student
  db.query(sql, values, (err, result) => {
    if (err) {
      // Duplicate Student ID
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          message: "This Student ID already exists. Please use a different ID."
        });
      }

      console.error("Add student error:", err.message);

      return res.status(500).json({
        message: "Could not add student."
      });
    }

    return res.status(201).json({
      message: "Student added successfully!",
      id: result.insertId
    });
  });
});

// POST - Allocate a room to a student
app.post("/api/allocations", (req, res) => {
  const { student_id, room_id } = req.body;

  if (!student_id || !room_id) {
    return res.status(400).json({
      message: "Student ID and Room ID are required"
    });
  }

  // Find the student using their student ID
  db.query(
    "SELECT id FROM students WHERE student_id = ?",
    [student_id],
    (err, students) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (students.length === 0) {
        return res.status(404).json({
          message: "Student not found. Add the student first."
        });
      }

      const studentDbId = students[0].id;

      // Check whether the student already has a room
      db.query(
        "SELECT id FROM allocations WHERE student_id = ?",
        [studentDbId],
        (err, existing) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (existing.length > 0) {
            return res.status(400).json({
              message: "This student already has a room allocated"
            });
          }

          // Check whether the room has space
          db.query(
            "SELECT * FROM rooms WHERE id = ?",
            [room_id],
            (err, rooms) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              if (rooms.length === 0) {
                return res.status(404).json({
                  message: "Room not found"
                });
              }

              const room = rooms[0];

              if (room.occupied >= room.capacity) {
                return res.status(400).json({
                  message: "This room is full"
                });
              }

              // Save the allocation
              db.query(
                `INSERT INTO allocations
                (student_id, room_id, allocation_date)
                VALUES (?, ?, CURDATE())`,
                [studentDbId, room_id],
                (err, result) => {
                  if (err) {
                    return res.status(500).json({
                      message: "Allocation failed",
                      error: err.message
                    });
                  }

                  // Increase the occupied count
                  db.query(
                    "UPDATE rooms SET occupied = occupied + 1 WHERE id = ?",
                    [room_id],
                    (err) => {
                      if (err) {
                        return res.status(500).json({
                          message: "Allocation saved, but room count could not be updated",
                          error: err.message
                        });
                      }

                      res.status(201).json({
                        message: "Room allocated successfully!",
                        allocation_id: result.insertId,
                        student_id: student_id,
                        room_id: Number(room_id)
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});
// GET - View all room allocations
app.get("/api/allocations", (req, res) => {
  const sql = `
    SELECT
      allocations.id AS allocation_id,
      students.student_id,
      students.name AS student_name,
      students.department,
      rooms.room_number,
      rooms.floor,
      allocations.allocation_date
    FROM allocations
    JOIN students
      ON allocations.student_id = students.id
    JOIN rooms
      ON allocations.room_id = rooms.id
    ORDER BY allocations.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Could not fetch allocations",
        error: err.message
      });
    }

    res.json(results);
  });
});
// GET - Dashboard statistics
app.get("/api/dashboard", (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM students) AS total_students,
      (SELECT COUNT(*) FROM rooms) AS total_rooms,
      (SELECT COALESCE(SUM(capacity), 0) FROM rooms) AS total_beds,
      (SELECT COALESCE(SUM(occupied), 0) FROM rooms) AS occupied_beds,
      (
        SELECT COALESCE(SUM(capacity - occupied), 0)
        FROM rooms
      ) AS available_beds
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Could not fetch dashboard statistics",
        error: err.message
      });
    }

    res.json(results[0]);
  });
});
const PORT = process.env.PORT || 5000;
// DELETE - Cancel a room allocation

app.delete("/api/allocations/:id", (req, res) => {
  const allocationId = Number(req.params.id);

  // Validate allocation ID
  if (!Number.isInteger(allocationId) || allocationId < 1) {
    return res.status(400).json({
      message: "Invalid allocation ID."
    });
  }

  // Start database transaction
  db.beginTransaction((transactionErr) => {
    if (transactionErr) {
      console.error(transactionErr.message);
      return res.status(500).json({
        message: "Could not start cancellation."
      });
    }

    // Roll back if any operation fails
    const fail = (statusCode, message) => {
      db.rollback(() => {
        res.status(statusCode).json({ message });
      });
    };

    // Find the room associated with this allocation
    db.query(
      "SELECT room_id FROM allocations WHERE id = ?",
      [allocationId],
      (err, results) => {
        if (err) {
          console.error(err.message);
          return fail(500, "Could not find allocation.");
        }

        if (results.length === 0) {
          return fail(404, "Allocation not found.");
        }

        const roomId = results[0].room_id;

        // Delete the allocation
        db.query(
          "DELETE FROM allocations WHERE id = ?",
          [allocationId],
          (deleteErr, deleteResult) => {
            if (deleteErr) {
              console.error(deleteErr.message);
              return fail(500, "Could not cancel allocation.");
            }

            if (deleteResult.affectedRows === 0) {
              return fail(404, "Allocation not found.");
            }

            // Decrease occupied beds
            db.query(
              `UPDATE rooms
               SET occupied = GREATEST(occupied - 1, 0)
               WHERE id = ?`,
              [roomId],
              (updateErr) => {
                if (updateErr) {
                  console.error(updateErr.message);
                  return fail(
                    500,
                    "Could not update room occupancy."
                  );
                }

                // Save both changes
                db.commit((commitErr) => {
                  if (commitErr) {
                    console.error(commitErr.message);

                    return db.rollback(() => {
                      res.status(500).json({
                        message: "Could not complete cancellation."
                      });
                    });
                  }

                  return res.json({
                    message: "Room allocation cancelled successfully!"
                  });
                });
              }
            );
          }
        );
      }
    );
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
