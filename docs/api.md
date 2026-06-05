# API Documentation

## Authentication

All API endpoints require JWT token in Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.000Z"
}
```

### Credentials

#### List Credentials

```
GET /api/credentials
```

Response:
```json
{
  "credentials": [
    {
      "id": "uuid",
      "name": "AWS Production",
      "cloudPlatform": "aws",
      "credentialType": "access_key"
    }
  ]
}
```

#### Create Credential

```
POST /api/credentials
```

Request:
```json
{
  "name": "AWS Production",
  "cloudPlatform": "aws",
  "credentialType": "access_key",
  "data": {
    "accessKeyId": "AKIA...",
    "secretAccessKey": "secret..."
  }
}
```

Response:
```json
{
  "id": "uuid"
}
```

#### Delete Credential

```
DELETE /api/credentials/:id
```

Response:
```json
{
  "success": true
}
```

### Dialogue

#### Process Message

```
POST /api/dialogue
```

Request:
```json
{
  "content": "查看AWS EC2实例",
  "mode": "plan"
}
```

Response:
```json
{
  "plan": {
    "steps": [
      {
        "action": "list_ec2_instances",
        "params": {
          "region": "us-east-1"
        }
      }
    ]
  }
}
```

## WebSocket

### Connect

```javascript
const socket = io('http://localhost:8080');
```

### Send Message

```javascript
socket.emit('message', {
  content: '查看AWS EC2实例',
  mode: 'ask'
});
```

### Receive Response

```javascript
socket.on('response', (data) => {
  console.log(data);
});
```

## Error Handling

All errors follow this format:

```json
{
  "error": "Error message",
  "statusCode": 400
}
```
