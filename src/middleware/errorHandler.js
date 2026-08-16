const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`)
  console.error(err.stack)

  const status = err.status || 500
  const message = err.message || 'Internal Server Error'

  const response = { error: message }

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack
  }

  res.status(status).json(response)
}

module.exports = errorHandler