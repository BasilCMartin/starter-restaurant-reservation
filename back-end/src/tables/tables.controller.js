const service = require("./tables.service");
const asyncErrorBoundary = require("../errors/asyncErrorBoundary");
const reservationsService = require("../reservations/reservations.service");


async function list(req, res, next) {
  const data = await service.list();
  res.json({ data: data });
}

async function create(req, res, next) {
  const table = req.body.data;
  const data = await service.create(table);
  res.status(201).json({ data: data });
}

// VALIDATION PIPELINE STARTS HERE
const VALID_PROPERTIES = ["table_name", "capacity"];

function hasRequiredFields(req, res, next) {
  const { data = {} } = req.body;
  console.log(data);
  const map = new Map();

  for (let property in data) {
    map.set(property);
  }

  for (let property of VALID_PROPERTIES) {
    if (!map.has(property)) {
      return next({
        status: 400,
        message: `Must include a ${property} field.`,
      });
    }
  }

  next();
}

function hasValidFieldInputs(req, res, next) {
  let { table_name, capacity } = req.body.data;

  if (capacity <= 0 || typeof capacity !== "number") {
    return next({
      status: 400,
      message: `Table capacity must be at least one. You entered: ${capacity}.`,
    });
  }

  table_name = table_name.replace(" ", "");
  if (table_name.length <= 1) {
    return next({
      status: 400,
      message: `Please enter a table_name that is at least 2 characters.`,
    });
  }

  if (table_name === "") {
    return next({
      status: 400,
      message: `Please provide a table_name.`,
    });
  }

  next();
}

async function tableExists(req, res, next) {
  const { table_id } = req.params;

  const table = await service.read(table_id);
  if (table) {
    res.locals.table = table;
    return next();
  }

  next({
    status: 404,
    message: `Table ${table_id} cannot be found.`,
  });
}

function tableIsAvailable(req, res, next) {
  const table = res.locals.table;
  if (table.reservation_id) {
    return next({
      status: 400,
      message: `Reservation cannot be seated. Table is occupied.`,
    });
  }
  next();
}

function tableIsNotAvailable(req, res, next) {
  const table = res.locals.table; 
  if (!table.reservation_id) {
    return next({
      status: 400,
      message: `Table cleared. Table is not occupied.`,
    });
  }
  next();
}

async function reservationExists(req, res, next) {
  const { data } = req.body;

  if (!data || !data.reservation_id) {
    return next({
      status: 400,
      message: `Missing valid reservation_id.`,
    });
  }

  const { reservation_id } = data;

  const reservationData = await service.readReservation(reservation_id);
  if (reservationData) {
    res.locals.people = reservationData.people;
    return next();
  }

  next({
    status: 404,
    message: `Reservation ${reservation_id} cannot be found.`,
  });
}


async function altReservationExists(req, res, next){
  const found = await reservationsService.read(req.body.data.reservation_id)
  if(found){
    res.locals.reservation = found;
    return next();
  }
  next({status:404, message:`Reservation not found ${req.body.data.reservation_id}!`});
}


function tableHasCapacity(req, res, next) {
  const table = res.locals.table;
  const people = res.locals.people;
  if (people > table.capacity) {
    return next({
      status: 400,
      message: `Table ${table.table_name} does not have a capacity of ${people} people.`,
    });
  }
  next();
}

async function update(req, res, next) {
  const table = res.locals.table;
  const { reservation_id } = req.body.data;
  const newTableData = {
    ...table,
    reservation_id: reservation_id,
  };
  const data = await service.update(newTableData);
  await service.updateReservationStatus1(newTableData);
  res.status(200).json({ data: data });
}

async function destroy(req, res, next) {
  const table = res.locals.table;
  const reservation = await reservationsService.read(table.reservation_id)
  await service.delete(table.table_id);
  await service.updateReservationStatus2(reservation)
  res.sendStatus(200);
}

function reservationIsNotAlreadySeated(req, res, next){
  const reservation = res.locals.reservation;
  console.log("🚀 ~ reservation.status", reservation.status);
  if(reservation.status === "seated") return next({status:400, message: `Reservation is already seated`});
  
  next();
}


module.exports = {
  list: [asyncErrorBoundary(list)],
  create: [hasRequiredFields, hasValidFieldInputs, asyncErrorBoundary(create)],
  update: [
    asyncErrorBoundary(tableExists),
    asyncErrorBoundary(reservationExists),
    asyncErrorBoundary(altReservationExists),
    tableHasCapacity,
    tableIsAvailable,
    reservationIsNotAlreadySeated,
    asyncErrorBoundary(update),
  ],
  delete: [asyncErrorBoundary(tableExists), tableIsNotAvailable, asyncErrorBoundary(destroy)],
};