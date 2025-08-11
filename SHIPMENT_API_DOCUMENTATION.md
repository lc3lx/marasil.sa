# Shipment API Documentation

## Customer Endpoints

### 1. Get Customer Shipments

**GET** `/api/shipments/my-shipments`

**Description:** Get all shipments for the authenticated customer

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**

```json
{
  "status": "success",
  "results": 5,
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 15,
    "itemsPerPage": 10
  },
  "data": [
    {
      "_id": "shipment_id",
      "trackingId": "TRK123456",
      "shipper": "Aramex",
      "shipmentStatus": "IN_TRANSIT",
      "orderValue": 150.0,
      "shippingPrice": 25.0,
      "customerId": {
        "_id": "customer_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+966501234567"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 2. Get Single Shipment

**GET** `/api/shipments/my-shipment/:id`

**Description:** Get a specific shipment by ID for the authenticated customer

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "_id": "shipment_id",
    "trackingId": "TRK123456",
    "shipper": "Aramex",
    "shipmentStatus": "IN_TRANSIT",
    "orderValue": 150.0,
    "shippingPrice": 25.0,
    "customerId": {
      "_id": "customer_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+966501234567"
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Search Shipments

**GET** `/api/shipments/search`

**Description:** Search shipments by various criteria

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `trackingNumber` (optional): Search by tracking number
- `phone` (optional): Search by customer phone
- `email` (optional): Search by customer email
- `shipmentId` (optional): Search by shipment ID
- `customerId` (optional): Search by customer ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**

```json
{
  "status": "success",
  "results": 1,
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "itemsPerPage": 10
  },
  "data": [
    {
      "_id": "shipment_id",
      "trackingId": "TRK123456",
      "shipper": "Aramex",
      "shipmentStatus": "IN_TRANSIT",
      "customerId": {
        "_id": "customer_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+966501234567"
      }
    }
  ]
}
```

### 4. Get Shipment Statistics

**GET** `/api/shipments/stats`

**Description:** Get shipment statistics for the authenticated customer

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "totalShipments": 25,
    "totalValue": 3750.0,
    "totalShippingCost": 625.0,
    "pendingShipments": 5,
    "deliveredShipments": 15,
    "inTransitShipments": 5,
    "shipperBreakdown": [
      {
        "_id": "Aramex",
        "count": 15
      },
      {
        "_id": "smsa_b2c",
        "count": 10
      }
    ]
  }
}
```

## Admin Endpoints

### 1. Get All Shipments (Admin)

**GET** `/api/shipments/all`

**Description:** Get all shipments for all customers (Admin only)

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by shipment status
- `shipper` (optional): Filter by shipper company
- `paymentMethod` (optional): Filter by payment method
- `startDate` (optional): Filter by start date (YYYY-MM-DD)
- `endDate` (optional): Filter by end date (YYYY-MM-DD)

**Response:**

```json
{
  "status": "success",
  "results": 50,
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20
  },
  "data": [
    {
      "_id": "shipment_id",
      "trackingId": "TRK123456",
      "shipper": "Aramex",
      "shipmentStatus": "IN_TRANSIT",
      "customerId": {
        "_id": "customer_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+966501234567",
        "company_name_ar": "شركة جون",
        "company_name_en": "John Company"
      }
    }
  ]
}
```

### 2. Get Single Shipment (Admin)

**GET** `/api/shipments/admin/:id`

**Description:** Get a specific shipment by ID (Admin only)

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "_id": "shipment_id",
    "trackingId": "TRK123456",
    "shipper": "Aramex",
    "shipmentStatus": "IN_TRANSIT",
    "customerId": {
      "_id": "customer_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+966501234567",
      "company_name_ar": "شركة جون",
      "company_name_en": "John Company"
    }
  }
}
```

### 3. Update Shipment (Admin)

**PUT** `/api/shipments/admin/:id`

**Description:** Update a shipment (Admin only)

**Headers:**

```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**

```json
{
  "shipmentStatus": "DELIVERED",
  "shipperStatus": "Delivered to recipient",
  "latestUpdateDate": "2024-01-16T10:30:00.000Z"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "تم تحديث الشحنة بنجاح",
  "data": {
    "_id": "shipment_id",
    "trackingId": "TRK123456",
    "shipmentStatus": "DELIVERED",
    "shipperStatus": "Delivered to recipient",
    "latestUpdateDate": "2024-01-16T10:30:00.000Z"
  }
}
```

### 4. Delete Shipment (Admin)

**DELETE** `/api/shipments/admin/:id`

**Description:** Delete a shipment (Admin only)

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "status": "success",
  "message": "تم حذف الشحنة بنجاح"
}
```

### 5. Search Shipments (Admin)

**GET** `/api/shipments/admin/search`

**Description:** Search shipments by various criteria (Admin only)

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Query Parameters:**

- `trackingNumber` (optional): Search by tracking number
- `phone` (optional): Search by customer phone
- `email` (optional): Search by customer email
- `shipmentId` (optional): Search by shipment ID
- `customerId` (optional): Search by customer ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**

```json
{
  "status": "success",
  "results": 1,
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "itemsPerPage": 10
  },
  "data": [
    {
      "_id": "shipment_id",
      "trackingId": "TRK123456",
      "shipper": "Aramex",
      "shipmentStatus": "IN_TRANSIT",
      "customerId": {
        "_id": "customer_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+966501234567",
        "company_name_ar": "شركة جون",
        "company_name_en": "John Company"
      }
    }
  ]
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "status": "error",
  "message": "جميع البيانات مطلوبة: company, order, shipperAddress, shipmentType, weight, Parcels"
}
```

### 401 Unauthorized

```json
{
  "status": "error",
  "message": "You are not login, Please login to get access this route"
}
```

### 403 Forbidden

```json
{
  "status": "error",
  "message": "You are not authorized to access this route"
}
```

### 404 Not Found

```json
{
  "status": "error",
  "message": "الشحنة غير موجودة"
}
```

### 500 Internal Server Error

```json
{
  "status": "error",
  "message": "فشل في جلب الشحنات: error message"
}
```

## Authentication

All endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Admin endpoints require additional authorization with admin or superadmin role.
