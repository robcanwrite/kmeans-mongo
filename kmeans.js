var collection = "truckdata";
var outputCollection = "kmeans";
var k = 3;

db[collection].aggregate(
  [
    {$sample: {size: k}},
    {$out: outputCollection}
  ])

var movement = 100;
var threshold = 0.001;
while(movement > threshold){
  db[collection].aggregate([
                             {
                               $lookup: {
                                 from    : outputCollection,
                                 as      : "closest",
                                 let     : {
                                   "speed"   : "$speed",
                                   "distance": "$distance"
                                 },
                                 pipeline: [{
                                   $addFields: {
                                     eucdist: {
                                       $sqrt: {
                                         $add: [
                                           {$pow: [{$subtract: ["$speed", "$$speed"]}, 2]},
                                           {$pow: [{$subtract: ["$distance", "$$distance"]}, 2]}
                                         ]
                                       }
                                     }
                                   }
                                 },
                                   {$sort: {eucdist: 1}},
                                   {$limit: 1}
                                 ]
                               }
                             },
                             {$unwind: "$closest"},
                             {
                               $group: {
                                 _id     : {distance: "$closest.distance", speed: "$closest.speed"},
                                 distance: {$avg: "$distance"},
                                 speed   : {$avg: "$speed"}
                               }
                             },
                             {$out: outputCollection}
                           ])

  var result = db[outputCollection].aggregate(
    [
      {
        $addFields: {
          movement: {
            $sqrt: {
              $add: [
                {$pow: [{$subtract: ["$speed", "$_id.speed"]}, 2]},
                {$pow: [{$subtract: ["$distance", "$_id.distance"]}, 2]}
              ]
            }
          }
        }
      },
      {
        $group: {_id: null, totalMovement: {$sum: "$movement"}}
      }
    ]
  );
  movement = result.next().totalMovement;
  print("next iteration, movement %f", movement);

}
