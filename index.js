
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Koneksi PostgreSQL
const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432
});

// Validasi ID
function validasiID(id) {
  return Number.isInteger(Number(id)) && Number(id) > 0;
}

// Validasi data menu
function validasiMenu(body) {
  const {
    nama_menu,
    kategori,
    harga,
    porsi,
    stok = 0,
    tersedia = true
  } = body;

  if (!nama_menu || !kategori || harga === undefined || porsi === undefined) {
    return 'Nama menu, kategori, harga, dan porsi wajib diisi';
  }

  if (!Number.isFinite(Number(harga)) || Number(harga) < 0) {
    return 'Harga harus berupa angka dan tidak boleh negatif';
  }

  if (!Number.isInteger(Number(porsi)) || Number(porsi) <= 0) {
    return 'Porsi harus berupa bilangan bulat lebih dari 0';
  }

  if (!Number.isInteger(Number(stok)) || Number(stok) < 0) {
    return 'Stok harus berupa bilangan bulat dan tidak boleh negatif';
  }

  if (typeof tersedia !== 'boolean') {
    return 'Tersedia harus bernilai true atau false';
  }

  return null;
}

// 1. GET: Menampilkan semua menu
app.get('/api/menu', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM menu_catering ORDER BY id ASC'
    );

    res.status(200).json({
      message: 'Berhasil mengambil semua menu',
      total: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      message: 'Gagal mengambil data menu',
      error: error.message
    });
  }
});

// 2. GET: Mencari menu berdasarkan nama
// Letakkan route search sebelum route berdasarkan ID
app.get('/api/menu/search/:nama', async (req, res) => {
  try {
    const nama = req.params.nama;

    const result = await db.query(
      'SELECT * FROM menu_catering WHERE nama_menu ILIKE $1 ORDER BY id ASC',
      [`%${nama}%`]
    );

    res.status(200).json({
      message: 'Hasil pencarian menu',
      total: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      message: 'Gagal mencari menu',
      error: error.message
    });
  }
});

// 3. GET: Menampilkan menu berdasarkan ID
app.get('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!validasiID(id)) {
      return res.status(400).json({
        message: 'ID harus berupa angka positif'
      });
    }

    const result = await db.query(
      'SELECT * FROM menu_catering WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'Menu tidak ditemukan'
      });
    }

    res.status(200).json({
      message: 'Berhasil mengambil detail menu',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      message: 'Gagal mengambil detail menu',
      error: error.message
    });
  }
});

// 4. POST: Menambahkan menu baru
app.post('/api/menu', async (req, res) => {
  try {
    const errorValidasi = validasiMenu(req.body);

    if (errorValidasi) {
      return res.status(400).json({
        message: errorValidasi
      });
    }

    const {
      nama_menu,
      kategori,
      deskripsi,
      harga,
      porsi,
      stok = 0,
      tersedia = true
    } = req.body;

    const result = await db.query(
      `INSERT INTO menu_catering
      (nama_menu, kategori, deskripsi, harga, porsi, stok, tersedia)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        nama_menu,
        kategori,
        deskripsi || null,
        harga,
        porsi,
        stok,
        tersedia
      ]
    );

    res.status(201).json({
      message: 'Menu berhasil ditambahkan',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      message: 'Gagal menambahkan menu',
      error: error.message
    });
  }
});

// 5. PUT: Mengubah menu berdasarkan ID
app.put('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!validasiID(id)) {
      return res.status(400).json({
        message: 'ID harus berupa angka positif'
      });
    }

    const errorValidasi = validasiMenu(req.body);

    if (errorValidasi) {
      return res.status(400).json({
        message: errorValidasi
      });
    }

    const {
      nama_menu,
      kategori,
      deskripsi,
      harga,
      porsi,
      stok = 0,
      tersedia = true
    } = req.body;

    const result = await db.query(
      `UPDATE menu_catering
       SET nama_menu = $1,
           kategori = $2,
           deskripsi = $3,
           harga = $4,
           porsi = $5,
           stok = $6,
           tersedia = $7
       WHERE id = $8
       RETURNING *`,
      [
        nama_menu,
        kategori,
        deskripsi || null,
        harga,
        porsi,
        stok,
        tersedia,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'Menu tidak ditemukan'
      });
    }

    res.status(200).json({
      message: 'Menu berhasil diperbarui',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      message: 'Gagal memperbarui menu',
      error: error.message
    });
  }
});

// 6. DELETE: Menghapus menu berdasarkan ID
app.delete('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!validasiID(id)) {
      return res.status(400).json({
        message: 'ID harus berupa angka positif'
      });
    }

    const result = await db.query(
      'DELETE FROM menu_catering WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'Menu tidak ditemukan'
      });
    }

    res.status(200).json({
      message: 'Menu berhasil dihapus',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      message: 'Gagal menghapus menu',
      error: error.message
    });
  }
});

// Menjalankan server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await db.query('SELECT 1');
    console.log('PostgreSQL berhasil terhubung!');

    app.listen(PORT, () => {
      console.log(`Server berjalan di http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Koneksi PostgreSQL gagal:', error.message);
    process.exit(1);
  }
}

startServer();
