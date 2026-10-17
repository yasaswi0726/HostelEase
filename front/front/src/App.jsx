import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [page, setPage] = useState("Dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const [stats, setStats] = useState({
    total_students: 0,
    total_rooms: 0,
    total_beds: 0,
    occupied_beds: 0,
    available_beds: 0,
  });

  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allocations, setAllocations] = useState([]);

  const [message, setMessage] = useState("");
  const [roomMessage, setRoomMessage] = useState("");
  const [allocationMessage, setAllocationMessage] = useState("");

  const [form, setForm] = useState({
    student_id: "",
    name: "",
    gender: "",
    department: "",
    year: "",
    phone: "",
  });

  const [roomForm, setRoomForm] = useState({
    room_number: "",
    floor: "",
    capacity: "",
  });

  const [allocationForm, setAllocationForm] = useState({
    student_id: "",
    room_id: "",
  });

  // Load dashboard statistics
  function loadStats() {
    fetch("http://localhost:5000/api/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load dashboard");
        return res.json();
      })
      .then((data) => setStats(data))
      .catch((err) => console.error(err));
  }

  // Load students
  function loadStudents() {
    fetch("http://localhost:5000/api/students")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load students");
        return res.json();
      })
      .then((data) => setStudents(data))
      .catch((err) => console.error(err));
  }

  // Load rooms
  function loadRooms() {
    fetch("http://localhost:5000/api/rooms")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load rooms");
        return res.json();
      })
      .then((data) => setRooms(data))
      .catch((err) => {
        console.error(err);
        setRoomMessage("Could not load rooms. Check the backend.");
      });
  }

  // Load room allocation records
  function loadAllocations() {
    fetch("http://localhost:5000/api/allocations")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load allocations");
        return res.json();
      })
      .then((data) => setAllocations(data))
      .catch((err) => setAllocationMessage(err.message));
  }

  // Load initial data
  useEffect(() => {
    loadStats();
    loadStudents();
    loadRooms();
    loadAllocations();
  }, []);

  // Handle student form changes
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // Add student
  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/students",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            year: form.year ? Number(form.year) : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not add student");
      }

      setMessage("Student added successfully!");

      setForm({
        student_id: "",
        name: "",
        gender: "",
        department: "",
        year: "",
        phone: "",
      });

      loadStudents();
      loadStats();
    } catch (error) {
      setMessage(error.message);
    }
  }

  // Add room
  async function handleRoomSubmit(e) {
    e.preventDefault();
    setRoomMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/rooms",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_number: roomForm.room_number,
            floor: Number(roomForm.floor),
            capacity: Number(roomForm.capacity),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not add room");
      }

      setRoomMessage("Room added successfully!");

      setRoomForm({
        room_number: "",
        floor: "",
        capacity: "",
      });

      loadRooms();
      loadStats();
    } catch (error) {
      setRoomMessage(error.message);
    }
  }

  // Delete room
  async function deleteRoom(id) {
    if (!window.confirm("Are you sure you want to delete this room?")) {
      return;
    }

    setRoomMessage("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/rooms/${id}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete room");
      }

      setRoomMessage("Room deleted successfully!");
      loadRooms();
      loadStats();
    } catch (error) {
      setRoomMessage(error.message);
    }
  }

  // Edit room details
  async function editRoom(room) {
    const newFloor = window.prompt(
      "Enter the new floor number:",
      String(room.floor)
    );

    if (newFloor === null || newFloor.trim() === "") {
      return;
    }

    const newCapacity = window.prompt(
      "Enter the new bed capacity:",
      String(room.capacity)
    );

    if (newCapacity === null || newCapacity.trim() === "") {
      return;
    }

    const floor = Number(newFloor);
    const capacity = Number(newCapacity);

    if (
      !Number.isInteger(floor) ||
      floor < 0 ||
      !Number.isInteger(capacity) ||
      capacity < 1
    ) {
      setRoomMessage("Enter a valid floor and bed capacity.");
      return;
    }

    if (capacity < Number(room.occupied)) {
      setRoomMessage(
        `Capacity cannot be less than occupied beds (${room.occupied}).`
      );
      return;
    }

    setRoomMessage("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/rooms/${room.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room_number: room.room_number,
            floor: floor,
            capacity: capacity,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update room.");
      }

      setRoomMessage("Room updated successfully!");

      loadRooms();
      loadStats();
    } catch (error) {
      setRoomMessage(error.message);
    }
  }

  // Allocate a room to a student
  async function handleAllocationSubmit(e) {
    e.preventDefault();
    setAllocationMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/allocations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: allocationForm.student_id,
            room_id: Number(allocationForm.room_id),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Room allocation failed");
      }

      setAllocationMessage("Room allocated successfully!");

      setAllocationForm({
        student_id: "",
        room_id: "",
      });

      loadAllocations();
      loadRooms();
      loadStats();
    } catch (error) {
      setAllocationMessage(error.message);
    }
  }

  // Cancel a room allocation
  async function cancelAllocation(id) {
    if (
      !window.confirm(
        "Are you sure you want to cancel this allocation?"
      )
    ) {
      return;
    }

    setAllocationMessage("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/allocations/${id}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not cancel allocation"
        );
      }

      setAllocationMessage("Allocation cancelled successfully!");

      loadAllocations();
      loadRooms();
      loadStats();
    } catch (error) {
      setAllocationMessage(error.message);
    }
  }

  // Dashboard cards
  const cards = [
    {
      title: "Total Students",
      value: stats.total_students,
      icon: "👨‍🎓",
    },
    {
      title: "Total Rooms",
      value: stats.total_rooms,
      icon: "🏢",
    },
    {
      title: "Total Beds",
      value: stats.total_beds,
      icon: "🛏️",
    },
    {
      title: "Occupied Beds",
      value: stats.occupied_beds,
      icon: "🔑",
    },
    {
      title: "Available Beds",
      value: stats.available_beds,
      icon: "✅",
    },
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img className="sidebar-brand-logo" src="/hostel-logo.svg" alt="HostelEase house logo" />
          <div className="sidebar-brand-text">
            <h2>HostelEase</h2>
            <p className="sidebar-subtitle">Hostel Management</p>
          </div>
        </div>

        <nav>
          {["Dashboard", "Students", "Rooms", "Room Allocation"].map(
            (item) => (
              <button
                key={item}
                className={`nav-button ${
                  page === item ? "active" : ""
                }`}
                onClick={() => {
                  setPage(item);
                  setMessage("");
                  setRoomMessage("");
                  setAllocationMessage("");

                  if (item === "Students") loadStudents();
                  if (item === "Dashboard") loadStats();

                  if (item === "Rooms") {
                    loadRooms();
                    loadStats();
                  }

                  if (item === "Room Allocation") {
                    loadStudents();
                    loadRooms();
                    loadAllocations();
                  }
                }}
              >
                <span className="nav-icon">{{ Dashboard: "⌂", Students: "♙", Rooms: "▣", "Room Allocation": "▤" }[item]}</span>
                <span>{item}</span>
              </button>
            )
          )}
        </nav>
      </aside>

      <main className="main-content">
        <header className="app-topbar">
          <div className="topbar-search-wrap">
            <span className="topbar-search-icon" aria-hidden="true">⌕</span>
            <input
              className="topbar-search"
              type="search"
              placeholder="Search students, rooms, or allocations..."
              aria-label="Search students, rooms, or allocations"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchTerm.trim()) {
                  const term = searchTerm.trim().toLowerCase();
                  if (students.some((student) => `${student.student_id} ${student.name} ${student.department || ""}`.toLowerCase().includes(term))) {
                    setPage("Students");
                    loadStudents();
                  } else if (rooms.some((room) => `${room.room_number} ${room.floor}`.toLowerCase().includes(term))) {
                    setPage("Rooms");
                    loadRooms();
                  } else {
                    setPage("Room Allocation");
                    loadAllocations();
                  }
                }
              }}
            />
          </div>
          <div className="topbar-actions">
            <div className="topbar-menu-wrap">
              <button className="topbar-icon-button" type="button" aria-label="Notifications" onClick={() => { setShowNotifications(!showNotifications); setShowAdminMenu(false); }}>
                ♧<span className="notification-dot" />
              </button>
              {showNotifications && <div className="topbar-popover"><strong>Notifications</strong><p>{allocations.length ? `${allocations.length} active room allocation${allocations.length === 1 ? "" : "s"}.` : "No room allocations yet."}</p><button type="button" onClick={() => { setPage("Room Allocation"); setShowNotifications(false); loadAllocations(); }}>View allocations</button></div>}
            </div>
            <div className="topbar-menu-wrap">
              <button className="admin-profile-button" type="button" onClick={() => { setShowAdminMenu(!showAdminMenu); setShowNotifications(false); }} aria-expanded={showAdminMenu}>
                <span className="admin-avatar" aria-hidden="true">♙</span><span className="admin-profile-label">Admin</span><span className="admin-chevron">⌄</span>
              </button>
              {showAdminMenu && <div className="topbar-popover admin-popover"><strong>Administrator</strong><p>HostelEase Management</p><button type="button" onClick={() => { setPage("Dashboard"); setShowAdminMenu(false); loadStats(); }}>Dashboard</button></div>}
            </div>
          </div>
        </header>
        {searchTerm.trim() && (
          <div className="search-feedback">Press Enter to search for “{searchTerm.trim()}”.</div>
        )}
        {/* Dashboard */}
        {page === "Dashboard" && (
          <>
            <section className="welcome-hero">
              <div className="welcome-hero-copy">
                <p className="eyebrow">HOSTEL MANAGEMENT OVERVIEW</p>
                <p className="welcome-greeting">Good Morning,</p>
                <h1>Welcome back, Admin!</h1>
                <p className="welcome-description">Manage your hostel, students, rooms and allocations all in one place.</p>
              </div>
              <div className="welcome-hero-image" role="img" aria-label="Modern hostel building surrounded by trees" />
            </section>

            <section className="stats-grid">
              {cards.map((card, index) => (
                <div className={`stat-card stat-card-${index + 1}`} key={card.title}>
                  <div>
                    <p>{card.title}</p>
                    <h2>{card.value}</h2>
                  </div>
                  <span className="stat-icon">{card.icon}</span>
                </div>
              ))}
            </section>

            <div className="dashboard-main-grid">
              <section className="welcome-card occupancy-panel">
                <div className="section-heading">
                  <div>
                    <h2>Bed Occupancy Overview</h2>
                    <p>Current hostel room usage</p>
                  </div>
                  <span className="heading-icon">📊</span>
                </div>
                <div className="occupancy-content">
                  <div
                    className="occupancy-ring"
                    style={{
                      background: `conic-gradient(#315df5 ${stats.total_beds > 0 ? (stats.occupied_beds / stats.total_beds) * 100 : 0}%, rgba(130, 157, 255, 0.22) 0)`,
                    }}
                  >
                    <div className="occupancy-ring-center">
                      <strong>
                        {stats.total_beds > 0
                          ? Math.round((stats.occupied_beds / stats.total_beds) * 100)
                          : 0}%
                      </strong>
                      <span>Occupied</span>
                    </div>
                  </div>
                  <div className="occupancy-legend">
                    <div><span className="legend-dot occupied-dot" /> <span>Occupied Beds</span><strong>{stats.occupied_beds}</strong></div>
                    <div><span className="legend-dot available-dot" /> <span>Available Beds</span><strong>{stats.available_beds}</strong></div>
                    <div className="legend-total"><span>Total Beds</span><strong>{stats.total_beds}</strong></div>
                  </div>
                </div>
                <div className="occupancy-progress-track">
                  <div
                    className="occupancy-progress-fill"
                    style={{ width: `${stats.total_beds > 0 ? Math.min(100, (stats.occupied_beds / stats.total_beds) * 100) : 0}%` }}
                  />
                </div>
              </section>

              <section className="welcome-card activity-panel">
                <div className="section-heading">
                  <div>
                    <h2>Recent Room Allocations</h2>
                    <p>Latest allocation records</p>
                  </div>
                  <button className="text-button" onClick={() => { setPage("Room Allocation"); loadAllocations(); }}>
                    View all →
                  </button>
                </div>
                {allocations.length > 0 ? (
                  <div className="recent-activity-list">
                    {allocations.slice(0, 4).map((allocation) => (
                      <div className="activity-item" key={allocation.allocation_id}>
                        <span className="activity-icon">🛏️</span>
                        <div className="activity-details">
                          <strong>{allocation.student_name}</strong>
                          <span>{allocation.student_id} → {allocation.room_number}</span>
                        </div>
                        <span className="activity-floor">Floor {allocation.floor}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-activity">
                    <span>🗂️</span>
                    <p>No room allocations yet.</p>
                    <small>New allocations will appear here.</small>
                  </div>
                )}
              </section>
            </div>

            <div className="dashboard-bottom-grid">
              <section className="welcome-card quick-actions-panel">
                <div className="section-heading">
                  <div>
                    <h2>Quick Actions</h2>
                    <p>Jump straight to a task</p>
                  </div>
                  <span className="heading-icon">⚡</span>
                </div>
                <div className="quick-actions-grid">
                  <button className="quick-action action-blue" onClick={() => { setPage("Students"); loadStudents(); }}>
                    <span>👨‍🎓</span><strong>Add Student</strong><small>Register a student →</small>
                  </button>
                  <button className="quick-action action-purple" onClick={() => { setPage("Rooms"); loadRooms(); loadStats(); }}>
                    <span>🛏️</span><strong>Manage Rooms</strong><small>Add or edit rooms →</small>
                  </button>
                  <button className="quick-action action-green" onClick={() => { setPage("Room Allocation"); loadStudents(); loadRooms(); loadAllocations(); }}>
                    <span>📋</span><strong>Allocate Room</strong><small>Assign a student →</small>
                  </button>
                  <button className="quick-action action-pink" onClick={() => { setPage("Room Allocation"); loadAllocations(); }}>
                    <span>📑</span><strong>View Allocations</strong><small>Check records →</small>
                  </button>
                </div>
              </section>

              <section className="welcome-card room-availability-panel">
                <div className="section-heading">
                  <div>
                    <h2>Room Availability</h2>
                    <p>Bed capacity at a glance</p>
                  </div>
                  <button className="text-button" onClick={() => { setPage("Rooms"); loadRooms(); loadStats(); }}>
                    View all →
                  </button>
                </div>
                <div className="table-wrapper dashboard-room-table">
                  <table>
                    <thead>
                      <tr><th>Room</th><th>Floor</th><th>Capacity</th><th>Available</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {rooms.slice(0, 5).map((room) => {
                        const available = Number(room.capacity) - Number(room.occupied);
                        const full = available <= 0;
                        return (
                          <tr key={room.id}>
                            <td>{room.room_number}</td>
                            <td>{room.floor}</td>
                            <td>{room.capacity}</td>
                            <td>{available}</td>
                            <td><span className={`room-status ${full ? "room-status-full" : available === 1 ? "room-status-partial" : "room-status-available"}`}>{full ? "Full" : available === 1 ? "Almost full" : "Available"}</span></td>
                          </tr>
                        );
                      })}
                      {rooms.length === 0 && <tr><td colSpan="5">No rooms added yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="welcome-card quick-stats-panel">
                <div className="section-heading">
                  <div><h2>Quick Stats</h2><p>Hostel capacity summary</p></div>
                  <span className="heading-icon">✨</span>
                </div>
                <div className="quick-stat-row">
                  <span className="quick-stat-icon purple-stat">🛏️</span>
                  <div className="quick-stat-info">
                    <div><strong>{stats.total_beds > 0 ? Math.round((stats.occupied_beds / stats.total_beds) * 100) : 0}%</strong><span>Occupancy rate</span></div>
                    <div className="mini-progress"><span className="mini-progress-blue" style={{ width: `${stats.total_beds > 0 ? Math.min(100, (stats.occupied_beds / stats.total_beds) * 100) : 0}%` }} /></div>
                  </div>
                </div>
                <div className="quick-stat-row">
                  <span className="quick-stat-icon green-stat">✅</span>
                  <div className="quick-stat-info">
                    <div><strong>{stats.total_beds > 0 ? Math.round((stats.available_beds / stats.total_beds) * 100) : 0}%</strong><span>Beds available</span></div>
                    <div className="mini-progress"><span className="mini-progress-green" style={{ width: `${stats.total_beds > 0 ? Math.min(100, (stats.available_beds / stats.total_beds) * 100) : 0}%` }} /></div>
                  </div>
                </div>
                <div className="dashboard-tip"><span>💡</span><div><strong>Keep up the good work!</strong><p>Use the dashboard to keep room information up to date.</p></div></div>
              </section>
            </div>
          </>
        )}

        {/* Students */}
        {page === "Students" && (
          <>
            <header className="topbar">
              <h1>Students Management</h1>
              <p>Add student details and view registered students.</p>
            </header>

            <section className="welcome-card">
              <h2>Add New Student</h2>

              <form className="student-form" onSubmit={handleSubmit}>
                <input
                  name="student_id"
                  placeholder="Student ID (e.g. STU101)"
                  value={form.student_id}
                  onChange={handleChange}
                  required
                />

                <input
                  name="name"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />

                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>

                <input
                  name="department"
                  placeholder="Department (e.g. CSE)"
                  value={form.department}
                  onChange={handleChange}
                />

                <select
                  name="year"
                  value={form.year}
                  onChange={handleChange}
                >
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>

                <input
                  name="phone"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={handleChange}
                  type="tel"
                />

                <button className="primary-button" type="submit">
                  Add Student
                </button>
              </form>

              {message && <p className="message">{message}</p>}
            </section>

            <section className="welcome-card">
              <h2>Registered Students</h2>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Gender</th>
                      <th>Department</th>
                      <th>Year</th>
                      <th>Phone</th>
                    </tr>
                  </thead>

                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td>{student.student_id}</td>
                        <td>{student.name}</td>
                        <td>{student.gender || "-"}</td>
                        <td>{student.department || "-"}</td>
                        <td>{student.year || "-"}</td>
                        <td>{student.phone || "-"}</td>
                      </tr>
                    ))}

                    {students.length === 0 && (
                      <tr>
                        <td colSpan="6">No students registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* Rooms */}
        {page === "Rooms" && (
          <>
            <header className="topbar">
              <h1>Rooms Management</h1>
              <p>Add rooms and monitor bed availability.</p>
            </header>

            <section className="welcome-card">
              <h2>Add New Room</h2>

              <form className="student-form" onSubmit={handleRoomSubmit}>
                <input
                  name="room_number"
                  placeholder="Room Number (e.g. A-101)"
                  value={roomForm.room_number}
                  onChange={(e) =>
                    setRoomForm({
                      ...roomForm,
                      room_number: e.target.value,
                    })
                  }
                  required
                />

                <input
                  name="floor"
                  type="number"
                  min="0"
                  placeholder="Floor Number"
                  value={roomForm.floor}
                  onChange={(e) =>
                    setRoomForm({
                      ...roomForm,
                      floor: e.target.value,
                    })
                  }
                  required
                />

                <input
                  name="capacity"
                  type="number"
                  min="1"
                  placeholder="Bed Capacity"
                  value={roomForm.capacity}
                  onChange={(e) =>
                    setRoomForm({
                      ...roomForm,
                      capacity: e.target.value,
                    })
                  }
                  required
                />

                <button className="primary-button" type="submit">
                  Add Room
                </button>
              </form>

              {roomMessage && <p className="message">{roomMessage}</p>}
            </section>

            <section className="welcome-card">
              <h2>Room Details</h2>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Room Number</th>
                      <th>Floor</th>
                      <th>Capacity</th>
                      <th>Occupied</th>
                      <th>Available</th>
                      <th>Occupancy</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rooms.map((room) => {
                      const capacity = Number(room.capacity) || 0;
                      const occupied = Number(room.occupied) || 0;
                      const available = Math.max(0, capacity - occupied);

                      const percentage =
                        capacity > 0
                          ? Math.min(
                              100,
                              Math.round((occupied / capacity) * 100)
                            )
                          : 0;

                      const status =
                        available === 0
                          ? "Full"
                          : occupied === 0
                          ? "Available"
                          : "Partially Occupied";

                      const statusClass =
                        status === "Full"
                          ? "status-full"
                          : status === "Available"
                          ? "status-available"
                          : "status-partial";

                      return (
                        <tr key={room.id}>
                          <td>{room.room_number}</td>
                          <td>{room.floor}</td>
                          <td>{capacity}</td>
                          <td>{occupied}</td>
                          <td>{available}</td>

                          <td>
                            <div className="occupancy-cell">
                              <div
                                className="occupancy-track"
                                role="progressbar"
                                aria-label={`Room ${room.room_number} occupancy`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={percentage}
                              >
                                <div
                                  className={`occupancy-fill ${statusClass}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span>{percentage}%</span>
                            </div>
                          </td>

                          <td>
                            <span className={`room-status ${statusClass}`}>
                              {status}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => editRoom(room)}
                            >
                              Edit
                            </button>{" "}
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => deleteRoom(room.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {rooms.length === 0 && (
                      <tr>
                        <td colSpan="8">No rooms found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* Room Allocation */}
        {page === "Room Allocation" && (
          <>
            <header className="topbar">
              <h1>Room Allocation</h1>
              <p>Assign students to rooms with available beds.</p>
            </header>

            <section className="welcome-card">
              <h2>Allocate a Room</h2>

              <form
                className="student-form"
                onSubmit={handleAllocationSubmit}
              >
                <select
                  value={allocationForm.student_id}
                  onChange={(e) =>
                    setAllocationForm({
                      ...allocationForm,
                      student_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select Student</option>
                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.student_id}
                    >
                      {student.student_id} - {student.name}
                    </option>
                  ))}
                </select>

                <select
                  value={allocationForm.room_id}
                  onChange={(e) =>
                    setAllocationForm({
                      ...allocationForm,
                      room_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select Available Room</option>
                  {rooms
                    .filter((room) => room.occupied < room.capacity)
                    .map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.room_number} —{" "}
                        {room.capacity - room.occupied} beds available
                      </option>
                    ))}
                </select>

                <button className="primary-button" type="submit">
                  Allocate Room
                </button>
              </form>

              {allocationMessage && (
                <p className="message">{allocationMessage}</p>
              )}
            </section>

            <section className="welcome-card">
              <h2>Allocation Records</h2>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Department</th>
                      <th>Room Number</th>
                      <th>Floor</th>
                      <th>Allocation Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {allocations.map((allocation) => (
                      <tr key={allocation.allocation_id}>
                        <td>{allocation.student_id}</td>
                        <td>{allocation.student_name}</td>
                        <td>{allocation.department || "-"}</td>
                        <td>{allocation.room_number}</td>
                        <td>{allocation.floor}</td>
                        <td>
                          {allocation.allocation_date
                            ? String(allocation.allocation_date).slice(0, 10)
                            : "-"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() =>
                              cancelAllocation(allocation.allocation_id)
                            }
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}

                    {allocations.length === 0 && (
                      <tr>
                        <td colSpan="7">No room allocations yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
