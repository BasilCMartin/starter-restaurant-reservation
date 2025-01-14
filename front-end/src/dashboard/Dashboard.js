import React, { useEffect, useState } from "react";
import { useLocation, useHistory } from "react-router";
import { listReservations, listTables } from "../utils/api";
import ErrorAlert from "../layout/ErrorAlert";
import ReservationsList from "./ReservationsList";
import { formatAsTime, previous, next, today } from "../utils/date-time";
import TableList from "./TableList";
import "./Dashboard.css"

function Dashboard({ date }) {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [reservationsError, setReservationsError] = useState(null);

  const history = useHistory();

  const urlQuery = useLocation().search;
  const dateQueryStart = urlQuery.search("date") + 5;
  date = urlQuery.slice(dateQueryStart, dateQueryStart + 10) || date;

  function formattedDay(date) {
    const d = new Date(date);
    const week = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    let weekDay = week[d.getDay()];
    let day = d.getDate();
    const month = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    let monthName = month[d.getMonth()];
    let year = d.getFullYear();

    const text = `${weekDay}, ${monthName} ${day + 1}, ${year}`;
    return text;
  }

  useEffect(loadDashboard, [date]);

  function loadDashboard() {
    const abortController = new AbortController();
    setReservationsError(null);

    listReservations({ date }, abortController.signal)
      .then(setReservations)
      .catch(setReservationsError);

    listTables(abortController.signal)
      .then(setTables)
      .catch(setReservationsError); // errors fetching tables adds to reservationsError array

    return () => abortController.abort();
  }

//const validReservations = reservations.filter((res)=>res.status !== "cancelled")


  const reservationsList = reservations.map((reservation, index) => (
    
    <ReservationsList
      key={index}
      reservation={reservation}
      formatTime={formatAsTime}
    />
  ));

  const tablesList = tables.map((table, index) => (
    <TableList 
    key={index} 
    table={table}
    loadDashboard={loadDashboard} 
    />
  ));

  const previousHandler = () => {
    const previousDate = previous(date);
    history.push(`/dashboard?date=${previousDate}`);
  };

  const nextHandler = () => {
    const nextDate = next(date);
    history.push(`/dashboard?date=${nextDate}`);
  };

  const todayHandler = () => {
    const todayDate = today();
    history.push(`/dashboard?date=${todayDate}`);
  };

  return (
    <main>
      <div id="main-banner" className="row">
        {reservationsError ? (
          <ErrorAlert errorMessage={reservationsError} />
        ) : (
          <></>
        )}
        <h3
          style={{ fontFamily: "Helvetica", fontSize: "2.5rem" }}
          className="col d-flex flex-wrap justify-content-center my-2"
        >
          {new Date().getHours() < 12 ? "Good morning." : "Good evening."}
        </h3>
        <h3 className="col-12 flex-wrap d-flex justify-content-center">
          Showing reservations for {formattedDay(date)}
        </h3>
        <div className="col d-flex flex-wrap justify-content-around my-3">
          <button
            type="button"
            name="previous-btn"
            id="scroll-button"
            className="ml-auto btn-danger text-dark"
            onClick={previousHandler}
          >
            Previous
          </button>
          <button
            type="button"
            name="next-btn"
            id="scroll-button"
            className="mx-3 btn-danger text-dark"
            onClick={nextHandler}
          >
            Next
          </button>
          <button
            type="button"
            name="today"
            id="scroll-button"
            className="mr-auto btn-primary text-dark"
            onClick={todayHandler}
          >
            Today
          </button>
        </div>
        <hr className="col-12" />
      </div>

      <div className="row">
        <div className="col col-7 d-flex flex-wrap" id="reservations">
          {reservationsList.length === 0 ? (
            <div id="no-reservations">
              <h3>There are no reservations for this date.</h3>
            </div>
          ) : (
            reservationsList
          )}
        </div>

        <br />

        <div className="col d-flex flex-wrap">
          {tablesList.length === 0 ? <h3>No Tables Listed</h3> : tablesList}
        </div>
      </div>
    </main>
  );
}

export default Dashboard;