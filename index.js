const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "database.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(4000, () => {
      console.log("Server Running at http://localhost:4000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//post
app.post('/transactions',async(request,response)=>{
    const{type,category,amount,date,description} = request.body;
    try{
    const postTransactionQuery = `
    INSERT INTO 
    transactions(type,category,amount,date,description)
    VALUES ('${type}',${category},${amount},'${date}','${description}');
    `;
    const result = await db.run(postTransactionQuery);
    response.status(201).send({id :result.lastID});
    }catch(error){
        response.status(500).json({error: error.message});
    }
});

//get 
app.get('/transactions',async (request,response)=>{
    const getTransactionsQuery = `
    SELECT *
    FROM transactions;
    `;
    try {
        const transactions = await db.all(getTransactionsQuery);
        response.status(200).send(transactions);
      } catch (error) {
        response.status(500).send({ error: "Unable to fetch transactions" });
      }
});

//GET /transactions/:id
app.get('/transactions/:id',async (request,response)=>{
    const {id} = request.params;
    const getTransactionQuery = `
    SELECT *
    FROM transactions
    WHERE id = ${id};
    `;
    try {
        const transaction = await db.get(getTransactionQuery);
        if(transaction){
            response.status(200).send(transaction);
        }
        else{
            response.status(404).send({error :"Transaction not Found"})
        }
      } catch (error) {
        response.status(500).send({ error: "Unable to fetch transaction" });
      }
});

//PUT /transactions/:id

app.put('/transactions/:id',async(request,response)=>{
    const {id} = request.params;
    const{type,category,amount,date,description} = request.body;
    const upadateTransactionQuery =`
    UPDATE transactions
    SET 
    type = '${type}',
    category = '${category}',
    amount = ${amount},
    date = '${date}';
    description = '${description}';
    `
    try{
        const result = await db.run(upadateTransactionQuery);
        response.status(200).send({message :"Transaction Updated Successfully"});
    }
    catch(error){
            response.status(500).send({error :"Unable to update"});
    }
});

//DELETE /transactions/:id:
app.delete('/transactions/:id',async(request,response)=>{
    const {id} = request.params;
    const deleteTransactionQuery = `
    DELETE 
    FROM transactions
    WHERE id = ${id};
    `;
    try{
       const result = await db.run(deleteTransactionQuery);
       if (result.changes === 0) {
        return response.status(404).json({ message: "Transaction not found" }); // Handle case where no transaction was found
    }
       response.status(200).send({message :"Transaction Deleted Successfully"});
    }
    catch(error){
        response.status(500).send({error : "Unable to Delete Transaction"});
    }
})

// GET /summary
app.get('/summary', async (request, response) => {
    const summaryQuery = `
        SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpenses
        FROM transactions;
    `;

    try {
        const summary = await db.get(summaryQuery);
        const balance = summary.totalIncome - summary.totalExpenses; // Calculate the balance

        response.status(200).send({
            totalIncome: summary.totalIncome || 0, 
            totalExpenses: summary.totalExpenses || 0,
            balance: balance 
        });
    } catch (error) {
        response.status(500).send({ error: "Unable to fetch summary" });
    }
});
