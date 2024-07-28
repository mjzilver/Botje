-- CHECK FOR DUPLICATES
SELECT message, datetime, COUNT(message) 
FROM messages 
GROUP BY message, datetime 
HAVING COUNT(message) >= 2 
ORDER BY COUNT(message) DESC;

-- DELETE DUPLICATES
DELETE FROM messages 
WHERE (message, datetime, id) IN 
(SELECT message, datetime, MIN(id) 
FROM messages 
GROUP BY message, datetime 
HAVING COUNT(*) > 1)