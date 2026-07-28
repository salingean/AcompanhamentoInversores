# Acompanhamento de Inversores ⚡

## 📖 Contexto e O Problema
Anteriormente, o acompanhamento dos dados dos inversores era realizado utilizando o **Power BI**. Porém, devido ao volume de dados e à necessidade de atualizações ágeis, os painéis do Power BI começaram a apresentar lentidão, afetando a produtividade e a visualização rápida das informações.

## 💡 A Solução
Para resolver o problema de performance, este projeto foi criado como uma solução sob medida e **muito mais rápida**. 

Ele ignora intermediários e se conecta **diretamente ao banco de dados** via uma API própria. Os dados são então enviados em tempo real para uma interface web leve e otimizada, permitindo que os gráficos e tabelas sejam carregados quase instantaneamente.

## ⚙️ Como Funciona?
A arquitetura do projeto é dividida em duas partes principais:

1. **Backend (API):** Desenvolvido em **Node.js** com **Express**. Ele se conecta de forma direta e segura ao banco de dados **SQL Server** da TOTVS (usando a biblioteca `mssql`). O backend é responsável por realizar as consultas pesadas de forma otimizada e retornar apenas os dados limpos que a interface precisa.
2. **Frontend (Interface):** Uma aplicação web super leve e rápida, empacotada usando o **Vite**. Utilizamos a biblioteca **ApexCharts** para desenhar gráficos modernos, responsivos e sem os gargalos de performance que o Power BI apresentava.

## ✨ Funcionalidades em Destaque
- 📈 **Gráficos Interativos e Fluidos:** Zoom in/out, pan e visualização de dados detalhados ao passar o mouse, sem travamentos.
- 🔍 **Ampliação (Modo Tela Cheia):** Possibilidade de expandir gráficos individuais para análise profunda dos dados de geração e irradiação.
- 🎨 **Personalização de Cores:** Os usuários podem alterar a cor das linhas dos gráficos conforme preferência visual.
- 🌓 **Modo Escuro (Dark Mode):** Alternância instantânea entre tema claro e escuro, garantindo conforto visual.
- 📅 **Filtros Ágeis:** Filtros por período (Data e Hora) independentes para cada inversor e aplicados quase instantaneamente.

## 🚀 Tecnologias Utilizadas

**Backend:**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) (Servidor Web)
- [mssql](https://www.npmjs.com/package/mssql) (Conexão com Banco de Dados SQL Server)
- [dotenv](https://www.npmjs.com/package/dotenv) (Gerenciamento de variáveis de ambiente/senhas)

**Frontend:**
- [Vite](https://vitejs.dev/) (Build tool e servidor de desenvolvimento ultra-rápido)
- [ApexCharts](https://apexcharts.com/) (Gráficos interativos de alta performance)
- HTML, CSS e JavaScript puros

---

## 🛠️ Como rodar o projeto na sua máquina

### 1. Pré-requisitos
- Ter o **Node.js** instalado na sua máquina.
- Ter acesso às credenciais do banco de dados (SQL Server).

### 2. Configurando e rodando o Backend
1. Abra o terminal e entre na pasta `backend`:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo chamado `.env` (use o `.env.example` como base, se houver) e preencha com as credenciais do banco de dados:
   ```env
   DB_USER=seu_usuario
   DB_PASSWORD=sua_senha
   DB_SERVER=endereco_do_banco
   DB_DATABASE=nome_do_banco
   PORT=3000
   ```
4. Inicie o servidor:
   ```bash
   npm start
   ```

### 3. Configurando e rodando o Frontend
1. Abra um **novo terminal** e entre na pasta `frontend`:
   ```bash
   cd frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie a interface de desenvolvimento:
   ```bash
   npm run dev
   ```
4. O terminal mostrará um link (normalmente `http://localhost:5173`). Basta clicar para abrir o dashboard no seu navegador!

---

*Desenvolvido com foco em performance para facilitar o acompanhamento de Inversores.*
