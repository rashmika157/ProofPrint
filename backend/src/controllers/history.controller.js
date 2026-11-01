import { getAllAnalysisRecords } from "../repositories/content-record.repository.js";

export function getHistory(_request, response, next) {
  try {
    response.status(200).json({
      records: getAllAnalysisRecords()
    });
  } catch (error) {
    next(error);
  }
}
