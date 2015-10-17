## Uber Routes

A dedicated Node.js worker for retrieving available Uber options given an origin and destination.

## Setup

```
git clone https://github.com/arosenberg01/Uber-Worker.git
cd Uber-Worker
```

To use the tasks implementation:
- [install RabbitMQ](https://www.rabbitmq.com/download.html)
- start a local RabbitMQ instance with ```rabbitmq-server``` 

Using two separate bash processes:
```
node pull.js  
node push.js  
```

## Uses

'main.js' exports ```getUberOptions(origin, destination)```, which retrieves available Uber options for a given start and end point. The origin and destination arguments can each be either a string address or an object with latitude and longitude coordinates. Ex:  

```javascript
getUberOptions("401 Geneva Ave, San Francisco, CA 94112",
   { longitude: -122.4088363, latitude: 37.7889758 })
```

```getUberOptions``` returns  an array of available Uber options in the format:  

```javascript
[
  {
    "price_localized_display_name":"uberX",  
    "price_high_estimate":20,  
    "price_minimum":5,  
    "price_duration":913,  
    "price_estimate":"$15-20",  
    "price_distance":7.23,  
    "price_display_name":"uberX",  
    "price_product_id":"a1111c8c-c720-46c3-8534-2fcdd730040d",  
    "price_low_estimate":15,  
    "price_surge_multiplier":1,  
    "price_currency_code":"USD",  
    "price_parsedArrivalTime":"15m",  
    "time_localized_display_name":"uberX",  
    "time_estimate":161,  
    "time_display_name":"uberX",  
    "time_product_id":"a1111c8c-c720-46c3-8534-2fcdd730040d",  
    "time_parsedDuration":"2m"
  },  
  
  {"price_localized_display_name":"uberX",  
  ...

```



## Sample Implementation

'pull.js' and 'push.js' demonstrate a sample implementation utilizing RabbitMQ for task management.


#### Enqueue Tasks

```javascript
node push.js *input-file*
```

If no file input is given, it defaults to using 'data/input.js'

The input file should be an array tasks formatted as JSON objects, where each object conforms to the requirements listed for getUberOptions. Ex:

```javascript
[
  {
    "origin": "401 Geneva Ave, San Francisco, CA 94112",
    "destination": {
      "longitude": "-122.4088363",
      "latitude": "37.7889758"
    }
  },

  {
    "origin": {
      "longitude": "-122.4474918",
      "latitude": "37.7214995"
    },
    "destination": {
      "longitude": "-122.4088363",
      "latitude": "37.7889758"
    }
  }
]
```

Each task has a time-stamped uuid attached and is stringified before being enqueued in the 'uber' queue.


#### Dequeue Tasks

```javascript
node pull.js *output-file*
```

If no file input is given, defaults to 'data/output.js'

Uber route tasks are dequeued from the 'uber' work queue, then have their results(or an error message with the corresponding uuid) appended to an output file.

Ex:
```javascript
{
  "uuid": "6eea6520-7457-11e5-95a2-e32dfc36b9a5",
  "start": {
    "address":"401 Genev a Ave, San Francisco, CA 94112",
    "coordinates": {
      "longitude":"-122.4474918",
      "latitude":"37.7214995"
    }
  },
  "finish": {
    "address":"449 Powell St, San Francisco, CA 94108",
    "coordinates": {
      "longitude":"-122.4088363",
      "latitude":"37.7889758"
    }
  },
  "estimates":
  [
    {
      "price_localized_display_name":"uberX",  
      "price_high_estimate":21,  
      "price_minimum":5,  
      "price_duration":1116,  
      "price_estimate":"$16-21",  
      "price_distance":7.23,  
      "price_display_name":"uberX",  
      "price_product_id":"a1111c8c-c720-46c3-8534-2fcdd730040d",  
      "price_low_estimate":16,  
      "price_surge_multiplier":1,  
      "price_currency_code":"USD",  
      "price_parsedArrivalTime":"18m",  
      "time_localized_display_name":"uberX",  
      "time_estimate":244,  
      "time_display_name":"uberX",  
      "time_product_id":"a1111c8c-c720-46c3-8534-2fcdd730040d",  
      "time_parsedDuration":"4m"},  

      {"price_localized_display_name":"uberX",  
      ...
}
```
